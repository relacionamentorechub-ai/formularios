# Setup Supabase + Vercel — Hub Interno REC

## 1. Tabelas Supabase (SQL Editor)

Cole no SQL Editor do projeto `dissknbpwxvhkjltuzya`:

```sql
-- Usuários do hub interno
create table if not exists hub_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz default now(),
  last_login timestamptz
);

-- Sugestões enviadas pelo modal "Sugerir alteração"
create table if not exists hub_suggestions (
  id uuid primary key default gen_random_uuid(),
  username text,
  pagina text,
  mensagem text not null,
  email_enviado boolean default false,
  created_at timestamptz default now()
);

-- RLS desligado (anon key acessa direto via REST — auth é feita na serverless)
alter table hub_users disable row level security;
alter table hub_suggestions disable row level security;
```

## 2. Variáveis de ambiente (Vercel → Settings → Environment Variables)

```
MASTER_PASSWORD = prosperidade@
AUTH_SECRET     = <gere aleatório, ex: openssl rand -hex 32>
RESEND_API_KEY  = re_xxx (criar conta em resend.com — grátis até 3k emails/mês)
SUPABASE_URL    = https://dissknbpwxvhkjltuzya.supabase.co
SUPABASE_KEY    = <anon key — já presente no index.html>
```

**Para `AUTH_SECRET`** rode no terminal:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Resend (envio do email de sugestão)

1. Criar conta em https://resend.com (login com Google em 30s)
2. Verificar domínio (opcional — sem domínio, manda do `onboarding@resend.dev` para o seu email)
3. Pegar API key em https://resend.com/api-keys
4. Adicionar `RESEND_API_KEY` no Vercel

## 4. Após configurar tudo

Redeploy o projeto no Vercel (Settings → Deployments → Redeploy). As env vars só carregam no próximo deploy.
