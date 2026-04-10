# CrawlerEye 👁️ | Next-Gen Web Crawler

![Version](https://img.shields.io/badge/version-2.5.0-blue)
![PHP](https://img.shields.io/badge/PHP-8.3-777bb4)
![JS](https://img.shields.io/badge/JavaScript-Vanilla-f7df1e)
![License](https://img.shields.io/badge/license-MIT-green)

O **CrawlerEye** é um rastreador web de alta performance especializado na extração de dados estruturados (**JSON-LD**). Projetado com uma arquitetura moderna e interface futurista, ele permite analisar sites inteiros através de sitemaps ou páginas isoladas em tempo real.

---

## ✨ Funcionalidades Principais

- 🚀 **Rastreio em Tempo Real:** Utiliza *Server-Sent Events (SSE)* para exibir resultados conforme são encontrados.
- 📂 **Suporte Híbrido:** Rastreia sitemaps XML complexos ou páginas HTML isoladas.
- 💎 **Extração de JSON-LD:** Identifica e formata automaticamente blocos de metadados estruturados.
- 📊 **Dashboard Dinâmico:** Painel interativo com estatísticas de sucesso, erro e volume de dados.
- 🔍 **Filtros Avançados:** Filtre resultados por status ou busca textual instantaneamente.
- 🌍 **Multilíngue (i18n):** Suporte nativo para Português, Inglês, Francês e Alemão.
- 🌓 **Sistema de Temas:** Modos Dark e Light com persistência no cache do navegador.
- 📤 **Exportação de Dados:** Baixe seus relatórios completos em formatos JSON ou CSV.

---

## 🛠️ Tecnologias Utilizadas

### Backend (Faca de Precisão)
- **PHP 8.3:** Lógica de negócio robusta e tipada.
- **cURL Engine:** Motor de requisições otimizado para evitar bloqueios.
- **PSR-4 Autoload:** Organização profissional de classes e namespaces.

### Frontend (User Experience)
- **Vanilla JS (ES6+):** Lógica orientada a objetos sem o peso de frameworks.
- **Modern CSS:** Glassmorphism, CSS Variables e Design Responsivo (Mobile-First).
- **i18n Manager:** Sistema de tradução reativo.

---

## 🚀 Como Instalar e Rodar

### Pré-requisitos
- PHP 8.3 ou superior.
- Extensão `curl` habilitada no PHP.
- [Composer](https://getcomposer.org/) (para o autoload).

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/crawler-eye.git
   cd crawler-eye
   ```

2. **Gere o Autoload:**
   ```bash
   composer dump-autoload
   ```

3. **Inicie o Servidor Local:**
   ```bash
   php -S localhost:8000
   ```

4. **Acesse no Navegador:**
   Abra [http://localhost:8000](http://localhost:8000) e comece a rastrear!

---

## 📂 Estrutura do Projeto

```text
CrawlerEye/
├── assets/             # Recursos de Interface (CSS, JS, Lang)
├── src/                # Lógica de Negócio (Services & Controllers)
├── vendor/             # Autoload do Composer
├── crawler.php         # Entry point da API (SSE)
├── index.html          # Esqueleto da Interface
└── README.md           # Documentação
```

---

## 🛡️ Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Desenvolvido por
**Nico**

> "O segredo para entender a web é saber olhar para os dados que ninguém vê." 👁️✨
