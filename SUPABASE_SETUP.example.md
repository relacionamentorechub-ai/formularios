# Setup Supabase + Vercel — Hub Interno REC (template)

> Não comite valores reais de senhas/keys neste arquivo. Use somente a Vercel → Environment Variables.

## 1. Tabelas Supabase (SQL Editor)

```sql
create table if not exists hub_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz default now(),
  last_login timestamptz
);

create table if not exists hub_suggestions (
  id uuid primary key default gen_random_uuid(),
  username text,
  pagina text,
  mensagem text not null,
  email_enviado boolean default false,
  created_at timestamptz default now()
);

-- IMPORTANTE: manter RLS ATIVO. A serverless usa service role / anon key apenas
-- de dentro das functions, nunca exposta ao cliente.
alter table hub_users enable row level security;
alter table hub_suggestions enable row level security;
alter table hub_leads enable row level security;
alter table hub_pdfs_gerados enable row level security;
alter table hub_reunioes enable row level security;
```

## 2. Variáveis de ambiente (Vercel → Settings → Environment Variables)

```
MASTER_PASSWORD   = <senha da empresa, longa e única>
AUTH_SECRET       = <gerar com: openssl rand -hex 32>
SUPABASE_URL      = https://<seu-projeto>.supabase.co
SUPABASE_KEY      = <anon key OU service role key — nunca expor no cliente>
ANTHROPIC_API_KEY = sk-ant-...
PDFSHIFT_API_KEY  = <opcional, se usar /api/generate-pdf>
RESEND_API_KEY    = re_...
RESEND_FROM       = "REC HUB <onboarding@resend.dev>"
SUGGESTION_TO     = <email destino do modal de sugestão>
```

## 3. Após configurar, redeploy

Settings → Deployments → Redeploy. As env vars só carregam no próximo deploy.

## 4. Rotação de credenciais

- Se qualquer destas chaves aparecer em commit/log/issue público: rotacione imediatamente.
- ANTHROPIC: console.anthropic.com → API Keys → revoke + create
- SUPABASE: dashboard → Settings → API → reset keys
- AUTH_SECRET: gere novo `openssl rand -hex 32` e atualize (vai invalidar todos os tokens, equipe precisa logar de novo)
