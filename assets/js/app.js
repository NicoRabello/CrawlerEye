class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('ce-theme') || 'dark';
        this.sunIcon = document.getElementById('sunIcon');
        this.moonIcon = document.getElementById('moonIcon');
        this.toggleBtn = document.getElementById('themeToggle');
        this.init();
    }

    init() {
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggle());
        }
        this.apply();
    }

    apply() {
        document.documentElement.setAttribute('data-theme', this.theme);
        if (this.sunIcon && this.moonIcon) {
            if (this.theme === 'dark') {
                this.sunIcon.style.display = 'block';
                this.moonIcon.style.display = 'none';
            } else {
                this.sunIcon.style.display = 'none';
                this.moonIcon.style.display = 'block';
            }
        }
        localStorage.setItem('ce-theme', this.theme);
    }

    toggle() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.apply();
    }
}

class LanguageManager {
    constructor() {
        this.lang = localStorage.getItem('ce-lang') || 'pt';
        this.dynamicValues = {};
        this.init();
    }

    init() {
        const select = document.getElementById('langSelect');
        if (select) {
            select.value = this.lang;
            select.addEventListener('change', (e) => this.setLang(e.target.value));
        }
        this.apply();
    }

    setLang(lang) {
        this.lang = lang;
        localStorage.setItem('ce-lang', this.lang);
        this.apply();
        window.dispatchEvent(new Event('languageChanged'));
    }

    apply() {
        const data = window.i18nData[this.lang];
        if (!data) return;

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            let text = data[key] || key;
            Object.keys(this.dynamicValues).forEach(vKey => {
                text = text.replace(`{${vKey}}`, this.dynamicValues[vKey]);
            });
            el.textContent = text;
        });

        document.querySelectorAll('[data-i18n-attr]').forEach(el => {
            const attrData = el.getAttribute('data-i18n-attr');
            if (attrData) {
                const [attr, key] = attrData.split(':');
                el.setAttribute(attr, data[key] || key);
            }
        });
    }

    get(key, params = {}) {
        const data = window.i18nData[this.lang];
        let text = (data && data[key]) ? data[key] : key;
        Object.keys(params).forEach(p => {
            text = text.replace(`{${p}}`, params[p]);
        });
        return text;
    }
}

class FeedbackManager {
    constructor() {
        this.container = document.getElementById('feedbackContainer');
    }

    show(type, message, title = '') {
        if (!this.container) return;
        
        const card = document.createElement('div');
        card.className = `feedback-card ${type}`;
        
        const icon = {
            success: '✓',
            warning: '⚠',
            error: '✖'
        }[type] || 'ℹ';

        card.innerHTML = `
            <div class="feedback-icon">${icon}</div>
            <div class="feedback-content">
                ${title ? `<div class="feedback-title">${title}</div>` : ''}
                <div class="feedback-message">${message}</div>
            </div>
        `;

        this.container.appendChild(card);
        
        if (type !== 'error') {
            setTimeout(() => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(-20px)';
                setTimeout(() => card.remove(), 300);
            }, 5000);
        }
    }

    clear() {
        if (this.container) this.container.innerHTML = '';
    }
}

class CrawlerUI {
    constructor() {
        this.urlInput = document.getElementById('urlInput');
        this.btnAction = document.getElementById('btnAction');
        this.lista = document.getElementById('listaLinks');
        this.localSearch = document.getElementById('localSearch');
        this.btnJson = document.getElementById('btnExportJson');
        this.btnCsv = document.getElementById('btnExportCsv');
        
        this.cardTotal = document.getElementById('cardTotal');
        this.cardOk = document.getElementById('cardOk');
        this.cardError = document.getElementById('cardError');
        this.cardJson = document.getElementById('cardJson');

        this.jsonInput = document.getElementById('jsonInput');
        this.btnValidate = document.getElementById('btnValidate');
        this.validationResult = document.getElementById('validationResult');
        
        this.eventSource = null;
        this.allResults = []; 
        this.stats = { total: 0, ok: 0, error: 0, ldjson: 0 };
        this.currentFilter = 'all';

        this.init();
    }

    init() {
        document.getElementById('tabCrawler').addEventListener('click', (e) => this.switchTab(e, 'crawler'));
        document.getElementById('tabValidator').addEventListener('click', (e) => this.switchTab(e, 'validator'));
        if (this.btnAction) this.btnAction.addEventListener('click', () => this.startCrawler());
        if (this.btnValidate) this.btnValidate.addEventListener('click', () => this.validateJson());
        if (this.localSearch) this.localSearch.addEventListener('input', () => this.applyFilters());
        if (this.btnJson) this.btnJson.addEventListener('click', () => this.exportJson());
        if (this.btnCsv) this.btnCsv.addEventListener('click', () => this.exportCsv());

        if (this.cardTotal) this.cardTotal.addEventListener('click', () => this.setFilter('all'));
        if (this.cardOk) this.cardOk.addEventListener('click', () => this.setFilter('ok'));
        if (this.cardError) this.cardError.addEventListener('click', () => this.setFilter('error'));
        if (this.cardJson) this.cardJson.addEventListener('click', () => this.setFilter('hasJson'));

        window.addEventListener('languageChanged', () => this.refreshList());
    }

    switchTab(e, tab) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        e.target.classList.add('active');
        document.getElementById(`content${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
    }

    setFilter(type) {
        this.currentFilter = type;
        [this.cardTotal, this.cardOk, this.cardError, this.cardJson].forEach(c => c.classList.remove('active'));
        
        const activeCard = {
            'all': this.cardTotal,
            'ok': this.cardOk,
            'error': this.cardError,
            'hasJson': this.cardJson
        }[type];

        if (activeCard) activeCard.classList.add('active');
        this.applyFilters();
    }

    applyFilters() {
        const query = this.localSearch ? this.localSearch.value.toLowerCase() : '';
        this.lista.innerHTML = '';
        
        const filtered = this.allResults.filter(item => {
            const matchesSearch = item.url.toLowerCase().includes(query);
            const matchesStatus = 
                this.currentFilter === 'all' || 
                (this.currentFilter === 'ok' && item.ok) || 
                (this.currentFilter === 'error' && !item.ok) ||
                (this.currentFilter === 'hasJson' && item.ldjson.length > 0);
            
            return matchesSearch && matchesStatus;
        });

        filtered.forEach(link => this.renderLink(link));
    }

    async startCrawler() {
        let url = this.urlInput.value.trim().replace(/\s/g, '');
        if (!url) {
            window.feedback.show('warning', window.i18n.get('conn_error'));
            return;
        }

        window.feedback.clear();
        this.urlInput.value = url;
        this.lista.innerHTML = '';
        this.allResults = [];
        this.resetStats();
        this.setFilter('all');
        this.btnAction.disabled = true;

        if (this.eventSource) this.eventSource.close();
        
        try {
            this.eventSource = new EventSource(`crawler.php?url=${encodeURIComponent(url)}`);
            
            this.eventSource.onmessage = (e) => {
                const data = JSON.parse(e.data);
                
                if (data.status === 'erro') {
                    window.feedback.show('error', data.mensagem);
                    this.stopCrawler();
                    return;
                }

                if (data.status === 'iniciando') {
                    this.stats.total = data.total;
                    this.updateDashboard();
                }

                if (data.status === 'update') {
                    this.allResults.push(data.link);
                    this.updateStats(data.link);
                    if (this.shouldShow(data.link)) {
                        this.renderLink(data.link);
                    }
                }

                if (data.status === 'concluido') {
                    this.stopCrawler();
                    window.feedback.show('success', window.i18n.get('status_ok'), `Crawler: ${this.allResults.length} links`);
                }
            };

            this.eventSource.onerror = () => {
                window.feedback.show('error', window.i18n.get('conn_error'));
                this.stopCrawler();
            };

        } catch (err) {
            window.feedback.show('error', err.message);
            this.stopCrawler();
        }
    }

    stopCrawler() {
        if (this.eventSource) this.eventSource.close();
        this.btnAction.disabled = false;
    }

    shouldShow(link) {
        const query = this.localSearch ? this.localSearch.value.toLowerCase() : '';
        const matchesSearch = link.url.toLowerCase().includes(query);
        const matchesStatus = 
            this.currentFilter === 'all' || 
            (this.currentFilter === 'ok' && link.ok) || 
            (this.currentFilter === 'error' && !link.ok) ||
            (this.currentFilter === 'hasJson' && link.ldjson.length > 0);
        
        return matchesSearch && matchesStatus;
    }

    async validateJson() {
        const jsonCode = this.jsonInput.value.trim();
        if (!jsonCode) {
            window.feedback.show('warning', 'Cole algum código JSON para validar.');
            return;
        }

        this.btnValidate.disabled = true;
        this.validationResult.innerHTML = '';
        window.feedback.clear();

        try {
            const response = await fetch('validator.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ json: jsonCode })
            });

            const data = await response.json();

            if (data.status === 'sucesso' && data.analysis) {
                this.displayValidationResults(data.analysis);
                if (data.analysis.isValidJson && data.analysis.issues.length === 0) {
                    window.feedback.show('success', 'JSON-LD válido!');
                } else if (data.analysis.isValidJson) {
                    window.feedback.show('warning', 'JSON válido, mas com melhorias sugeridas.');
                } else {
                    window.feedback.show('error', 'JSON inválido.');
                }
            } else {
                window.feedback.show('error', data.mensagem || 'Erro desconhecido.');
            }
        } catch (error) {
            window.feedback.show('error', 'Erro de conexão com o servidor.');
        } finally {
            this.btnValidate.disabled = false;
        }
    }

    displayValidationResults(analysis) {
        this.validationResult.innerHTML = '';
        const title = document.createElement('h3');
        title.className = 'validation-title';
        title.textContent = `${window.i18n.get('val_res_title')} (${analysis.type})`;
        title.style.marginBottom = '1.5rem';
        this.validationResult.appendChild(title);

        if (analysis.issues.length === 0) {
            const successMsg = document.createElement('div');
            successMsg.className = 'issue-card';
            successMsg.style.borderColor = 'var(--success)';
            successMsg.textContent = window.i18n.get('val_success_valid', { type: analysis.type });
            this.validationResult.appendChild(successMsg);
        } else {
            analysis.issues.forEach(issue => {
                const issueDiv = document.createElement('div');
                issueDiv.className = `issue-card issue-${issue.severity}`;
                const message = window.i18n.get(issue.key, issue.params);
                const severityLabel = window.i18n.get('val_' + issue.severity).toUpperCase();

                issueDiv.innerHTML = `
                    <strong class="issue-title">${severityLabel}:</strong> 
                    ${message}
                    <div class="issue-fix"><strong>${window.i18n.get('val_fix')}</strong> ${issue.fix}</div>
                `;
                this.validationResult.appendChild(issueDiv);
            });
        }
    }

    resetStats() {
        this.stats = { total: 0, ok: 0, error: 0, ldjson: 0 };
        this.updateDashboard();
    }

    updateStats(link) {
        if (link.ok) this.stats.ok++; else this.stats.error++;
        this.stats.ldjson += link.ldjson.length;
        this.updateDashboard();
    }

    updateDashboard() {
        const els = {
            'statTotal': this.stats.total,
            'statOk': this.stats.ok,
            'statError': this.stats.error,
            'statLdJson': this.stats.ldjson
        };
        for (const [id, val] of Object.entries(els)) {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        }
    }

    renderLink(link) {
        const div = document.createElement('div');
        div.className = 'result-item';
        
        const header = document.createElement('div');
        header.className = 'item-header';
        header.addEventListener('click', function() {
            const details = this.nextElementSibling;
            details.style.display = details.style.display === 'block' ? 'none' : 'block';
        });

        const jsonText = link.ldjson.length > 0 ? `${window.i18n.get('json_found')} (${link.ldjson.length})` : '';
        
        header.innerHTML = `
            <div class="url-text">
                <span class="status-dot" style="width:10px; height:10px; border-radius:50%; background:${link.ok ? 'var(--success)' : 'var(--error)'}"></span>
                ${link.url}
            </div>
            <div class="result-item-header-info">${jsonText}</div>
        `;

        const details = document.createElement('div');
        details.style.display = 'none';
        details.innerHTML = `<pre>${link.ldjson.length > 0 ? JSON.stringify(link.ldjson, null, 2) : window.i18n.get('no_data')}</pre>`;

        div.appendChild(header);
        div.appendChild(details);
        this.lista.insertBefore(div, this.lista.firstChild);
    }

    exportJson() {
        const blob = new Blob([JSON.stringify(this.allResults, null, 2)], { type: 'application/json' });
        this.download(blob, `crawler-results-${new Date().getTime()}.json`);
    }

    exportCsv() {
        const rows = [["URL", "Status", "OK", "JSON_LD_Blocks"]];
        this.allResults.forEach(r => rows.push([r.url, r.status, r.ok, r.ldjson.length]));
        const csvContent = rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        this.download(blob, `crawler-results-${new Date().getTime()}.csv`);
    }

    download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    refreshList() {
        this.applyFilters();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.i18n = new LanguageManager();
    window.themeManager = new ThemeManager();
    window.feedback = new FeedbackManager();
    window.crawler = new CrawlerUI();
});
