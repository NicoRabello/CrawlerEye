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

    setDynamicValue(key, value) {
        this.dynamicValues[key] = value;
        this.apply();
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

        document.querySelectorAll('[data_i18n-attr]').forEach(el => {
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



class CrawlerUI {
    constructor() {
        this.urlInput = document.getElementById('urlInput');
        this.btnAction = document.getElementById('btnAction');
        this.lista = document.getElementById('listaLinks');
        this.dashboard = document.getElementById('dashboard');
        this.searchControls = document.getElementById('searchControls');
        this.localSearch = document.getElementById('localSearch');
        this.btnJson = document.getElementById('btnExportJson');
        this.btnCsv = document.getElementById('btnExportCsv');
        
        this.cardTotal = document.getElementById('cardTotal');
        this.cardOk = document.getElementById('cardOk');
        this.cardError = document.getElementById('cardError');
        this.cardJson = document.getElementById('cardJson');
        
        this.tabCrawlerBtn = document.getElementById('tabCrawler');
        this.tabValidatorBtn = document.getElementById('tabValidator');
        this.contentCrawler = document.getElementById('contentCrawler');
        this.contentValidator = document.getElementById('contentValidator');
        
        this.eventSource = null;
        this.allResults = []; 
        this.stats = { total: 0, ok: 0, error: 0, ldjson: 0 };
        this.currentFilter = 'all';

        this.init();
        this.setupTabListeners();
        // Define o estado inicial para a aba do Crawler
        this.switchTab('crawler');
    }

    init() {
        if (this.btnAction) this.btnAction.addEventListener('click', () => this.start());
        if (this.localSearch) this.localSearch.addEventListener('input', () => this.applyFilters());
        if (this.btnJson) this.btnJson.addEventListener('click', () => this.exportJson());
        if (this.btnCsv) this.btnCsv.addEventListener('click', () => this.exportCsv());

        if (this.cardTotal) this.cardTotal.addEventListener('click', () => this.setFilter('all'));
        if (this.cardOk) this.cardOk.addEventListener('click', () => this.setFilter('ok'));
        if (this.cardError) this.cardError.addEventListener('click', () => this.setFilter('error'));
        if (this.cardJson) this.cardJson.addEventListener('click', () => this.setFilter('hasJson'));

        this.dashboard.style.display = 'grid';
        this.searchControls.style.display = 'flex';

        window.addEventListener('languageChanged', () => this.refreshList());
    }

    setupTabListeners() {
        // Adiciona listener APENAS para a aba do Crawler
        if (this.tabCrawlerBtn && this.contentCrawler) {
            this.tabCrawlerBtn.addEventListener('click', () => this.switchTab('crawler'));
            console.log('Crawler tab listener attached.');
        } else {
            console.warn('Crawler tab elements not found.');
        }

        // A aba do Validador NÃO terá seu listener ativo, e seu conteúdo permanece oculto pelo CSS.
        if (this.tabValidatorBtn) {
            console.log('Validator tab button found, but its listener is intentionally not set to keep it inactive.');
            // Opcional: Desabilitar visualmente se desejado, mas o CSS já o mantém oculto.
        }
        if (this.contentValidator) {
            this.contentValidator.style.display = 'none'; // Garante que esteja oculto por padrão
        }
    }

    switchTab(tabId) {
        console.log(`Switching to tab: ${tabId}`);

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            console.log(`Removed active class from: ${btn.id}`);
        });
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        const activeContent = document.getElementById(`content${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
        const activeBtn = document.getElementById(`tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
        
        if (activeContent) {
            activeContent.classList.add('active');
            console.log(`Added 'active' class to content: ${activeContent.id}`);
        } else {
            console.error(`Content element not found for tab: ${tabId}`);
        }
        if (activeBtn) {
            activeBtn.classList.add('active');
            console.log(`Added 'active' class to button: ${activeBtn.id}`);
        } else {
            console.error(`Button element not found for tab: ${tabId}`);
        }
    }

    setFilter(type) {
        this.currentFilter = type;
        const cards = [this.cardTotal, this.cardOk, this.cardError, this.cardJson];
        cards.forEach(c => { if (c) c.classList.remove('card-active'); });
        
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

    start() {
        let url = this.urlInput.value.trim().replace(/\s/g, '');
        if (!url) return;
        this.urlInput.value = url;
        this.lista.innerHTML = '';
        this.allResults = [];
        this.resetStats();
        this.setFilter('all');
        
        this.searchControls.style.display = 'flex';

        if (this.eventSource) this.eventSource.close();
        this.eventSource = new EventSource(`crawler.php?url=${encodeURIComponent(url)}`);
        
        this.eventSource.onmessage = (e) => {
            const data = JSON.parse(e.data);
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
                this.eventSource.close();
                this.stats.total = this.allResults.length;
                this.updateDashboard();
            }
        };
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

    // --- Validador ---
    async validateJson() {
        const jsonCode = this.jsonInput.value.trim();
        if (!jsonCode) {
            alert(i18n.get('validation_error_empty'));
            return;
        }

        this.btnValidate.disabled = true;
        if (this.validationResult) this.validationResult.style.display = 'block';
        this.validationResult.innerHTML = '<div class="issue-card"><div class="issue-title">Validando...</div></div>';

        try {
            const response = await fetch('validator.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ json: jsonCode })
            });

            const data = await response.json();

            if (data.status === 'sucesso' && data.analysis) {
                this.displayValidationResults(data.analysis);
            } else {
                this.displayValidationError(data.mensagem || 'Erro desconhecido ao validar.');
            }
        } catch (error) {
            this.displayValidationError('Erro de conexão com o servidor do validador.');
        } finally {
            this.btnValidate.disabled = false;
        }
    }

    displayValidationResults(analysis) {
        this.validationResult.innerHTML = '';
        const title = document.createElement('h3');
        title.className = 'validation-title';
        title.setAttribute('data-i18n', 'val_res_title');
        title.textContent = i18n.get('val_res_title');
        title.style.marginBottom = '1rem';
        title.style.fontWeight = 'bold';
        this.validationResult.appendChild(title);

        if (!analysis.isValidJson) {
            this.showIssue('grave', analysis.issues[0].message, analysis.issues[0].fix);
            return;
        }

        if (analysis.issues.length === 0) {
            const successMsg = document.createElement('p');
            successMsg.textContent = 'JSON-LD válido e bem estruturado!';
            successMsg.style.color = 'var(--success)';
            this.validationResult.appendChild(successMsg);
        } else {
            analysis.issues.forEach(issue => {
                this.showIssue(issue.severity, issue.message, issue.fix);
            });
        }
    }

    showIssue(severity, message, fix) {
        const issueDiv = document.createElement('div');
        issueDiv.className = `issue-card issue-${severity}`;
        issueDiv.innerHTML = `
            <strong class="issue-title">${i18n.get('val_' + severity).toUpperCase()}:</strong> ${message}
            <div class="issue-fix"><strong>${i18n.get('val_fix')}</strong> ${fix}</div>
        `;
        this.validationResult.appendChild(issueDiv);
    }

    displayValidationError(message) {
        this.validationResult.innerHTML = `<div class="issue-card issue-grave"><strong class="issue-title">ERRO:</strong> ${message}</div>`;
    }

    // --- Métodos de Exportação e Crawler (mantidos) ---
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
        const id = 'id-' + Math.random().toString(36).substr(2, 9);
        const div = document.createElement('div');
        div.className = 'result-item';
        
        const header = document.createElement('div');
        header.className = 'item-header';
        header.addEventListener('click', function() {
            const details = this.nextElementSibling;
            details.style.display = details.style.display === 'block' ? 'none' : 'block';
        });

        const jsonText = link.ldjson.length > 0 ? `${i18n.get('json_found')} (${link.ldjson.length})` : '';
        
        header.innerHTML = `
            <div class="url-text"><span class="status-dot ${link.ok ? 'dot-ok' : 'dot-error'}"></span>${link.url}</div>
            <div class="result-item-header-info">${jsonText}</div>
        `;

        const details = document.createElement('div');
        details.id = id;
        details.style.display = 'none';
        details.innerHTML = `<pre>${link.ldjson.length > 0 ? JSON.stringify(link.ldjson, null, 2) : i18n.get('no_data')}</pre>`;

        div.appendChild(header);
        div.appendChild(details);
        this.lista.insertBefore(div, this.lista.firstChild);
    }

    exportJson() {
        const blob = new Blob([JSON.stringify(this.allResults, null, 2)], { type: 'application/json' });
        this.download(blob, 'crawler-results.json');
    }

    exportCsv() {
        const rows = [["URL", "Status", "OK", "JSON_LD_Blocks"]];
        this.allResults.forEach(r => rows.push([r.url, r.status, r.ok, r.ldjson.length]));
        const csvContent = rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        this.download(blob, 'crawler-results.csv');
    }

    download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    }

    refreshList() {
        this.applyFilters();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.i18n = new LanguageManager();
    window.themeManager = new ThemeManager();
    window.crawler = new CrawlerUI();
});

