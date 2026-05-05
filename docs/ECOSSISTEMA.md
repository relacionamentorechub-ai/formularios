# REC HUB — Resumo do Ecossistema Digital Interno
**Atualizado em: maio de 2026**

---

## O que é o REC HUB

O REC HUB é uma plataforma interna desenvolvida para a equipe R.E.C. HUB de Negócios. Funciona como um ecossistema de ferramentas digitais acessível via navegador, com login protegido, geração de PDFs profissionais com IA, pipeline de CRM e gestão completa do ciclo comercial — tudo sem depender de softwares pagos externos.

**URL de produção:** Vercel (deploy automático via GitHub)
**Repositório:** `relacionamentorechub-ai/formularios`
**Branch:** `master`

---

## Ferramentas disponíveis (10 páginas)

| Página | Arquivo | Função | Tem IA | Tem PDF |
|--------|---------|--------|--------|---------|
| Hub (Dashboard) | `index.html` | Central com gráfico de pipeline e KPIs por membro | Não | Não |
| Diagnóstico Digital | `diagnostico.html` | Análise de perfil + proposta comercial | Sim (Claude) | Sim |
| Briefing de Campanha | `campanha.html` | Brief para Meta Ads | Sim (Claude) | Não |
| Geração de Conteúdo | `conteudo.html` | Pautas, legendas, roteiros | Sim (Claude) | Não |
| Briefing de Reunião | `briefing.html` | Preparação pré-call com cliente | Sim (Claude) | Não |
| Reuniões | `reunioes.html` | Agendamento no Google Agenda | Não | Não |
| Pipeline CRM | `crm.html` | Gestão de leads em kanban (6 estágios) | Não | Não |
| Relatório Mensal | `relatorio.html` | Relatório de resultados do cliente | Não | Sim |
| Gerador de Contrato | `contrato.html` | Contrato de prestação de serviços | Não | Sim |
| Login | `login.html` | Autenticação da equipe | Não | Não |

---

## Infraestrutura técnica

### Hospedagem
- **Vercel** (plano gratuito Hobby) — deploy automático a cada push no GitHub
- Output directory: `docs/` — site estático com serverless functions em `api/`

### Banco de dados
- **Supabase** (projeto: `ooufmzqdiehrxnqoqvsi`) — plano gratuito (500MB, 50k requests/mês)
- Tabelas: `hub_users`, `hub_suggestions`, `hub_leads`, `hub_pdfs_gerados`, `hub_reunioes`

### IA
- **Anthropic Claude API** — modelo `claude-opus-4-7` para análises e geração de conteúdo
- Custo médio por análise completa: ~$0,04–0,08 USD (entrada ~3k tokens + saída ~2k tokens)

### E-mail
- **Resend** — envio de sugestões da equipe por e-mail
- Sender: `onboarding@resend.dev` (plano gratuito, 3k emails/mês)

---

## APIs serverless (Vercel Functions)

| Endpoint | Método | Função |
|----------|--------|--------|
| `POST /api/auth` | POST | Login e verificação de token |
| `POST /api/claude` | POST (SSE) | Geração de análise/conteúdo com IA |
| `POST /api/generate-pdf` | POST | Geração de PDF via Puppeteer (reserva) |
| `POST /api/suggestion` | POST | Envio de sugestão por e-mail + Supabase |
| `GET/POST/PATCH/DELETE /api/leads` | REST | CRUD de leads do pipeline CRM |
| `GET /api/dashboard` | GET | Stats agregados para o gráfico do dashboard |

---

## Geração de valor para a equipe

### Tempo economizado por mês (estimativa)

| Atividade | Sem o hub | Com o hub | Economia |
|-----------|-----------|-----------|----------|
| Montar análise digital de lead | 90 min | 8 min | **~80 min/análise** |
| Elaborar proposta comercial | 45 min | 3 min | **~42 min/proposta** |
| Briefing de reunião | 20 min | 3 min | **~17 min/brief** |
| Gerar conteúdo (pauta + legendas) | 40 min | 5 min | **~35 min/cliente** |
| Geração de contrato | 30 min | 4 min | **~26 min/contrato** |
| Relatório mensal por cliente | 60 min | 8 min | **~52 min/cliente** |

**Com 10 clientes ativos e 4 análises/semana:** estimativa de 25–35 horas economizadas por mês.

### Valor gerado em receita

- Análises rápidas = mais propostas enviadas = mais conversões
- Pipeline CRM centralizado = menos leads perdidos por falta de acompanhamento
- Relatórios profissionais = maior retenção de clientes (demonstra valor entregue)
- Contratos rápidos = menos fricção no fechamento

---

## Custo mensal atual do hub

| Serviço | Plano | Custo |
|---------|-------|-------|
| Vercel | Hobby (gratuito) | R$ 0 |
| Supabase | Free (gratuito) | R$ 0 |
| Resend | Free (gratuito) | R$ 0 |
| Anthropic API | Pay-per-use | ~R$ 15–40/mês (variável por volume) |
| **Total** | | **~R$ 15–40/mês** |

> O custo só cresce com o uso da IA. Com 20 análises/mês: ~R$ 8. Com 80 análises/mês: ~R$ 32.

---

## O que poderia ser assinado/comprado para aumentar valor

### Prioritário

| Ferramenta | Para que serve | Custo estimado |
|------------|---------------|----------------|
| **Resend Pro** | Domínio verificado (`@rechub.com.br`) para e-mails profissionais | ~R$ 35/mês |
| **Supabase Pro** | Mais espaço, backups automáticos, sem cold start | ~R$ 130/mês |
| **Canva Pro** | Templates de relatório e contrato com marca REC | ~R$ 55/mês |
| **Make (Integromat) Free** | Automações (notificar equipe quando lead entra no CRM) | Grátis até 1k ops |

### Médio prazo

| Ferramenta | Para que serve | Custo estimado |
|------------|---------------|----------------|
| **Vercel Pro** | Remove limite de 10s nas functions, melhor performance | ~R$ 100/mês |
| **Cloudflare R2** | Armazenar PDFs gerados na nuvem com URL permanente | ~R$ 0–15/mês |
| **Cal.com Pro** | Agendamento online para clientes com integração Google | ~R$ 30/mês |
| **WhatsApp Business API** | Notificações automáticas ao cliente quando relatório é gerado | ~R$ 50–100/mês |

---

## Próximas evoluções sugeridas

1. **Score de Maturidade Digital** — pontuação 0-100 por cliente, gerado junto com a análise
2. **Portal do Cliente** — acesso externo com senha, o cliente vê seus relatórios e proposta
3. **Aprovação de Conteúdo** — link enviado ao cliente para aprovar posts antes de publicar
4. **Notificações WhatsApp** — aviso automático quando uma proposta é gerada ou contrato enviado
5. **Tracking de abertura de proposta** — saber quando o cliente abriu o PDF

---

## Membros com acesso

- **Paola** — acesso completo
- **Fran** — acesso completo
- **Jaque** — acesso completo
- Henrique — recebe sugestões da equipe por e-mail

> Novos usuários são criados diretamente na tabela `hub_users` no Supabase (hash bcrypt da senha).

---

*Documento gerado automaticamente pelo REC HUB · recolaborativo.com.br*
