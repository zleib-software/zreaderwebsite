# ZReader — Página Oficial de Download

Página única, estática, ultra-fluida e acessível para download do [ZReader](https://github.com/zleib-software/ZReader).
Construída com **HTML5 + CSS Moderno + JavaScript ES2022 nativo**, sem ferramentas de build, sem frameworks e pronta para hospedagem no plano gratuito da Vercel.

---

## 🚀 Como Rodar Localmente

Devido ao uso de módulos ECMAScript nativos (`<script type="module">`), a página não funciona através do protocolo `file://`. Execute com qualquer servidor estático local:

```bash
npx serve .
```

Ou usando Python:
```bash
python -m http.server 3000
```

Abra no navegador em `http://localhost:3000`.

---

## 🌐 Deploy na Vercel

1. Suba este projeto para um repositório no GitHub.
2. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório.
3. Configure o projeto:
   - **Framework Preset**: `Other`
   - **Build Command**: *(deixe vazio)*
   - **Output Directory**: *(deixe vazio)*
4. Clique em **Deploy**.

As configurações de segurança (CSP, COOP, Permissions-Policy), cabeçalhos de cache otimizados e rotas limpas já estão definidas no arquivo [vercel.json](file:///c:/Users/Gabri/Downloads/files/vercel.json).

---

## 📦 Como Publicar uma Nova Versão do ZReader

A página se comunica diretamente com a API pública do GitHub Releases e se atualiza automaticamente (com cache local de 10 minutos):

1. Acesse o repositório oficial do ZReader (`zleib-software/ZReader`).
2. Crie uma nova Release com a tag no formato `vX.Y.Z` (ex: `v1.2.0`).
3. Anexe os arquivos compilados:
   - **Windows Instalador**: `ZReader Setup X.Y.Z.exe` (o nome deve conter `Setup` ou `installer`).
   - **Windows Portátil**: `ZReader X.Y.Z.exe` ou `ZReader-portable.exe`.
   - **Windows Pacote ZIP**: `ZReader-X.Y.Z-win.zip`.
   - **Android APK**: `ZReader-X.Y.Z.apk` (preferencialmente versão universal ou `arm64`).
4. Ao publicar, o site exibirá os links diretos para download, versões e datas atualizadas.

> **Nota sobre limites da API**: Sem token de autenticação, o GitHub limita consultas a 60 requisições/hora por IP. O site implementa estratégia *Stale-While-Revalidate* com cache local em `localStorage` (10 min) e fallback automático para a página geral de releases em caso de indisponibilidade.

---

## 🧪 Parâmetros de Teste e QA

Você pode testar todos os estados da interface via query strings na URL sem chamar a API do GitHub:

### Simulação de Plataforma (`?os=`)
- `?os=windows` — Força a visualização para desktop Windows (destaca o instalador .exe).
- `?os=android` — Força a visualização para Android (destaca o APK).
- `?os=mac` — Simula macOS (exibe faixa informativa de plataforma não suportada).
- `?os=ios` — Simula iPhone / iPad (exibe faixa informativa).
- `?os=linux` — Simula Linux desktop.

### Simulação de Estados de Release (`?release=`)
- `?release=demo` — Carrega dados de demonstração com v1.0.0, arquivos de teste, hashes SHA-256 e links de integridade.
- `?release=empty` — Simula repositório sem releases publicadas (estado "Em breve").
- `?release=error` — Simula erro de resposta da API do GitHub.
- `?release=ratelimit` — Simula estouro da cota de 60 req/h (exibe fallback gracioso).
- `?release=offline` — Simula falta de conexão à internet.
- `?release=slow` — Aguarda 3 segundos em estado de carregamento (skeletons) antes de carregar o modo demo.

---

## 📝 Configurações e Pendências de Produção

Antes de lançar publicamente em seu domínio próprio:

1. **Domínio oficial**:
   - Configurado para `https://zleibreader.vercel.app` em:
     - [index.html](file:///c:/Users/Gabri/Downloads/files/index.html) (`canonical`, `og:url`, `og:image`, `twitter:image`)
     - [robots.txt](file:///c:/Users/Gabri/Downloads/files/robots.txt) (`Sitemap: ...`)
     - [sitemap.xml](file:///c:/Users/Gabri/Downloads/files/sitemap.xml) (`<loc>...`)
2. **Fontes Self-Hosted**:
   - Os arquivos WOFF2 já foram baixados e se encontram em `assets/fonts/` (`poppins-latin-{400,500,600,700}-normal.woff2`).
3. **Imagem Open Graph**:
   - O arquivo vetorial está pronto em `assets/img/og.svg`. Para máxima compatibilidade com redes sociais (Facebook/Twitter), você pode converter este SVG para `assets/img/og.png` (1200×630px).

---

## ✅ Checklist de Aceite e Garantia de Qualidade

- [x] Paleta e componentes 100% fiéis à identidade do aplicativo ZReader (fundo `#0d0d0f`, acento `#c6e03a`).
- [x] Zero bibliotecas externas ou frameworks (apenas CSS puro com `@layer` e JS modular nativo).
- [x] Mockup fluido com escala por ResizeObserver e efeito 3D Tilt com LERP em `requestAnimationFrame`.
- [x] Abas WAI-ARIA no celular com navegação por teclado e roving tabindex.
- [x] Verificação de integridade SHA-256 com comando de cópia direta.
- [x] Detecção precisa de SO e WebViews embutidas (Instagram/TikTok/Facebook).
- [x] Zero layout shift (dimensões reservadas para metadados).
- [x] Respeito estrito a `prefers-reduced-motion` e `forced-colors`.
