# Configuração Vercel - Backend Serverless

## ✅ Próximos Passos

### 1. Criar conta no Vercel (se não tiver)
- Vá para https://vercel.com
- Faça login com GitHub
- Clique "New Project"

### 2. Conectar este repositório
- Selecione: `relacionamentorechub-ai/formularios`
- Clique "Import"

### 3. Adicionar variável de ambiente
Na página de configuração do projeto:
1. Clique em **Settings**
2. Vá para **Environment Variables**
3. Adicione:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: `sk-ant-api03-QGirYYk8rXM2ypaI1FGDHfAVJvUnOyz6elaPVscNcpI5z6g6xC9T7WSaI6QZ5xL35atqGmQQ--HSVdwAA`
4. Clique **Save**

### 4. Deploy automático
- Após adicionar a variável, o Vercel faz deploy automático
- Você verá o link da sua aplicação (ex: `https://formularios-lime.vercel.app`)

### 5. Configurar domínio customizado
1. Em **Domains**
2. Clique **Add**
3. Digite seu domínio: `formularios.somosrecoficial.com.br`
4. Siga as instruções para atualizar DNS

## 🔒 Segurança

- ✅ Chave API protegida no servidor (não exposta no cliente)
- ✅ Repositório pode ficar **PÚBLICO** sem risco
- ✅ Funções serverless executam no backend do Vercel

## 📁 Estrutura criada

```
/api
  ├── claude.js      (proxy para Claude API)
  └── usage.js       (proxy para usage endpoint)
/docs
  └── Formulário Solicitação de Diagnóstico.html (modificado para usar /api/*)
vercel.json         (configuração Vercel)
```

## 🚀 Pronto!

Depois de fazer deploy, seu site estará:
- Acessível em: `https://formularios.somosrecoficial.com.br`
- Com a chave API protegida no servidor
- Repositório público (seguro!)
