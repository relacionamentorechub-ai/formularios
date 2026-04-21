# Mercadinho — Setup (2 minutos)

App do mercadinho do condomínio. Frontend em `docs/mercadinho.html`, API em `api/mercadinho.js`.

**URL final** (depois do deploy): `https://formularios.somosrecoficial.com.br/mercadinho.html`

## O que o GitHub + Vercel já resolvem
- ✅ Hospedagem do site (grátis)
- ✅ Função serverless da API (grátis)
- ✅ Deploy automático a cada push

## O que você precisa fazer (única vez)

### 1. Ativar o banco de dados (Vercel KV)

O estoque precisa ser salvo em algum lugar para que o que o admin mudou apareça para os clientes. Vercel KV é grátis, nativo do Vercel, não precisa sair do dashboard.

1. Entre no [dashboard do Vercel](https://vercel.com/dashboard) e abra seu projeto.
2. Clique na aba **Storage** → **Create Database**.
3. Escolha **KV** (Redis-compatible).
4. Dê um nome (ex: `mercadinho-db`) e clique em **Create**.
5. Na tela seguinte, clique em **Connect Project** e selecione seu projeto.
6. Pronto. As variáveis de ambiente são criadas automaticamente:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_URL`
   - outras (não precisa mexer)

### 2. Definir a senha de administrador

Você (dono) vai usar essa senha para entrar na área de admin. Ninguém mais tem acesso.

1. No Vercel, vá em **Settings** → **Environment Variables**.
2. Adicione:
   - **Name**: `ADMIN_PASSWORD`
   - **Value**: uma senha forte escolhida por você
   - **Environment**: marque **Production**, **Preview** e **Development**
3. Clique em **Save**.

### 3. Redeploy

Para as novas variáveis fazerem efeito:
- Vá em **Deployments** → clique no último deploy → **Redeploy**.
- Ou simplesmente faça um novo commit/push.

## Como usar

### Cliente (morador do condomínio)
Acessa: `https://formularios.somosrecoficial.com.br/mercadinho.html`
- Vê só produtos com estoque > 0
- Filtra por categoria
- Não vê preço de custo nem margem

### Admin (você)
1. Clica no ícone **⚙** (canto superior direito)
2. Digita a senha
3. Duas abas:
   - **Estoque**: lista dos produtos. Pode `+`/`-` quantidade, editar preço, excluir. Mostra margem em tempo real.
   - **Adicionar**: foto (tira da câmera ou escolhe do celular), nome, categoria, preço custo, preço venda, quantidade. Mostra margem enquanto digita.

A senha fica salva no navegador para não precisar digitar toda vez. Para sair, limpe os dados do site no navegador.

## Produtos iniciais (já vêm prontos)

1. Água Mineral 500ml — R$ 3,50 (Bebidas)
2. Refrigerante Lata 350ml — R$ 6,00 (Bebidas)
3. Cerveja Long Neck 330ml — R$ 9,00 (Alcoólicos)
4. Chocolate ao Leite 90g — R$ 8,50 (Doces)
5. Batata Chips 90g — R$ 10,00 (Salgados)

Podem ser editados ou excluídos a qualquer momento no painel admin.

## Categorias disponíveis

Bebidas, Alcoólicos, Doces, Salgados, Padaria, Congelados, Uso Pessoal, Limpeza, Outros.

## Limites do plano grátis

- **Vercel KV grátis**: 256MB de storage, 30.000 comandos/dia. Muito mais que o suficiente.
- **Imagens**: cada foto é comprimida para ~30-60KB no navegador antes de enviar. Dá para cadastrar ~500 produtos com foto tranquilamente.

## Se o app mostra "Vercel KV não configurado"
Significa que as env vars `KV_REST_API_URL`/`KV_REST_API_TOKEN` não existem. Volte ao passo 1.

## Se login falha com senha certa
Significa que `ADMIN_PASSWORD` não está setada ou o deploy não rodou depois de criá-la. Faça um Redeploy (passo 3).
