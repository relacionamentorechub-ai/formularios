# REC HUB — Projeto de Código

@../CONTEXTO/CLAUDE.md

---

## Stack técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML/JS vanilla em `docs/` (10 páginas) |
| APIs | Vercel Functions Node.js ESM em `api/` |
| Banco | Supabase — tabelas `hub_users`, `hub_leads`, `hub_pdfs_gerados`, `hub_reunioes`, `hub_suggestions` |
| IA | Anthropic Claude API via `/api/claude` (SSE streaming) |
| Email | Resend via `api/suggestion` |
| PDF | PdfShift external API via `api/generate-pdf` |
| Deploy | Vercel (automático via push no GitHub, plano Plus — max 300s por função) |

## Autenticação

- Token no localStorage: `rec_hub_token` (NÃO `hub_token`)
- Formato: HMAC-SHA256 JWT-like, `body.sig` em duas partes base64url
- Helper global: `window.apiFetch()` em `_hub.js` — injeta Bearer, faz logout em 401
- `AUTH_SECRET` fallback: `rec-hub-dev-secret-change-me`
- `MASTER_PASSWORD` padrão: `prosperidade@`

## Modelos Claude disponíveis

| Modelo | API ID | Input | Output |
|--------|--------|-------|--------|
| Opus 4.7 | `claude-opus-4-7` | $5/MTok | $25/MTok |
| Sonnet 4.6 | `claude-sonnet-4-6` | $3/MTok | $15/MTok |
| Haiku 4.5 | `claude-haiku-4-5-20251001` | $1/MTok | $5/MTok |

Padrão para análises: `claude-sonnet-4-6`. Haiku para tarefas leves/rascunhos.

## Env vars (Vercel Production)

`ANTHROPIC_API_KEY`, `SUPABASE_KEY`, `SUPABASE_URL`, `RESEND_API_KEY`, `PDFSHIFT_API_KEY`, `AUTENTIQUE_API_KEY`

## Regras técnicas do projeto

- Commits seguem Conventional Commits (`feat`, `fix`, `refactor`, etc.)
- Branch: `master` no repo `relacionamentorechub-ai/formularios`
- Deploy automático via push — testar localmente antes
- PDFs gerados via PdfShift (não `iframe.print()`) — preserva formatação independente do navegador
- Logo REC em base64 carregada via `docs/_rec_logo.js` como `window.REC_LOGO_B64`
- Análises usam `div.pdf-page` explícitos (nunca `@page` + `break-inside` free-flow)

## Executor técnico

Todas as sugestões técnicas devem ser viáveis com o setup do **Henrique Caleffi** (Mac, sem VS Code, ferramentas: Make/n8n, Supabase, Vercel, Z-API, OpenAI, Anthropic).
