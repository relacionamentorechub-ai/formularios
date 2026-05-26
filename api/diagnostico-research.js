// Pesquisa REAL ÚNICA antes da geração das páginas.
// Usa web_search pra coletar dados verificados sobre o lead.
// Retorna JSON estruturado que será passado para TODAS as chamadas de página,
// garantindo consistência (mesmo número de seguidores, mesmo ticket, mesmos concorrentes
// em todas as páginas).

export const config = { maxDuration: 120 };

import { applyCors, requireAuth, rateLimit, readBody } from './_lib.js';

const RESEARCH_PROMPT = `Você é um analista de dados de mercado digital. Sua missão: coletar dados REAIS e VERIFICADOS sobre um lead.

Você TEM acesso à ferramenta web_search. Use-a OBRIGATORIAMENTE para:
1. Buscar o Instagram do lead: "instagram.com/{handle}" — tente extrair followers, posting frequency
2. Buscar benchmarks reais do setor: "engajamento médio instagram {segmento} brasil 2025", "ticket médio {segmento} {cidade}"
3. Buscar concorrentes na cidade: "{segmento} {cidade} instagram" — encontre nomes REAIS
4. Se houver site, buscar dados sobre ele: "{dominio} reviews", "{dominio} seo"

RETORNE EXCLUSIVAMENTE UM JSON VÁLIDO (sem texto antes ou depois, sem markdown, sem comentários):

{
  "instagram": {
    "handle": "string sem @",
    "followers": número se encontrou OU null,
    "posting_frequency_obs": "string descritiva curta (ex: 'irregular', 'até 3x/semana')",
    "engajamento_estimado_pct": número com decimais OU null,
    "obs": "1-2 frases observações específicas DESTE perfil"
  },
  "setor": {
    "nome": "string",
    "engajamento_medio_pct_brasil": número (ex: 0.6 para 0,6%),
    "fonte_engajamento": "string (ex: 'mLabs Social Media Trends 2024')",
    "ticket_medio_brl_min": número,
    "ticket_medio_brl_max": número,
    "ticket_medio_brl_central": número (média entre min e max),
    "fonte_ticket": "string fonte (ex: 'Cronoshare 2024')",
    "cac_estimado_min": número,
    "cac_estimado_max": número,
    "fonte_cac": "string",
    "obs_mercado": "1-2 frases sobre dinâmica do setor brasileiro"
  },
  "cidade": {
    "nome": "string com UF",
    "populacao_estimada": número OU null,
    "porte": "string (ex: 'cidade média', 'metrópole', 'cidade pequena')",
    "obs_local": "1-2 frases sobre potencial digital local"
  },
  "concorrentes": [
    {"nome": "Nome Real Encontrado", "instagram": "@handle se encontrou", "followers": número OU null, "obs": "1 frase do que faz"}
  ],
  "site": {
    "url": "string ou null",
    "tem_ssl": true/false/null,
    "tecnologia": "string ou null",
    "obs_seo": "string com observações"
  }
}

REGRAS ABSOLUTAS:
- NÃO INVENTE NÚMEROS. Se a busca não retornar dado confiável, use null. Melhor null do que dado errado.
- Para concorrentes: cite no MÁXIMO 4 nomes REAIS. Se não encontrou concorrente local específico, inclua redes nacionais conhecidas do setor que atuam na região (Tok&Stok, Etna, etc para móveis; O Boticário, Eudora para beleza, etc).
- Para Instagram followers: SÓ inclua se a busca retornou número específico. Se não, null.
- Para ticket médio: pesquise faixas reais publicadas. Use ranges sempre que possível.
- Cite SEMPRE a fonte do número (mLabs, Cronoshare, ABComm, Resultados Digitais, etc).

NÃO escreva NADA além do JSON puro. Começe com { e termine com }.`;

function buildLeadContext(lead) {
  const linhas = [
    `Pesquise os seguintes dados para o lead:`,
    '',
    `EMPRESA: ${lead.nome_empresa || 'Não informada'}`,
    `INSTAGRAM: ${lead.instagram || ''}`,
    `SEGMENTO: ${lead.segmento || 'Não informado'}`,
    `CIDADE: ${lead.cidade || 'Não informada'}`,
  ];
  if (lead.site) linhas.push(`SITE: ${lead.site}`);
  if (lead.canais) linhas.push(`CANAIS: ${lead.canais}`);
  if (lead.observacoes) linhas.push(`OBSERVAÇÕES: ${lead.observacoes}`);
  return linhas.join('\n');
}

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST,OPTIONS')) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  const rl = rateLimit(req, 'diagnostico-research', 10, 60000);
  if (rl.blocked) { res.setHeader('Retry-After', rl.retryAfter); return res.status(429).json({ error: 'Rate limit' }); }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const body = readBody(req);
  const { lead } = body;
  if (!lead || typeof lead !== 'object') return res.status(400).json({ error: 'lead object required' });

  const userMessage = buildLeadContext(lead);

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000, // generoso pq web_search results contam aqui
        system: RESEARCH_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
        stream: false,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 4,
          },
        ],
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return res.status(upstream.status).json({ error: err });
    }

    const data = await upstream.json();
    let raw = '';
    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'text' && block.text) raw += block.text;
      }
    }
    raw = raw.trim();

    // Strip markdown if present
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    }
    // Extract JSON object (pega do primeiro { ao último })
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      raw = raw.slice(firstBrace, lastBrace + 1);
    }

    let research;
    try {
      research = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({
        error: 'Falha ao parsear JSON de pesquisa: ' + e.message,
        preview: raw.slice(0, 400),
      });
    }

    return res.status(200).json({
      research,
      tokens: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0,
        searches: data.usage?.server_tool_use?.web_search_requests || 0,
      },
    });
  } catch (error) {
    console.error('[diagnostico-research] erro:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
