// Gera o DIAGNÓSTICO INTEIRO em UMA chamada (6 páginas, ou 7 com proposta).
// Substitui a arquitetura page-by-page (diagnostico-page.js) que gerava cada página
// cega às outras e causava corte/página em branco/inconsistência.
// Espelha a skill .claude/skills/analise-rec-hub: um único cérebro forte (Sonnet 4.6)
// escreve o documento com contexto completo. O CSS é FIXO e injetado pelo frontend —
// o modelo gera APENAS os div.pdf-page (mesmo contrato do page.js).

export const config = { maxDuration: 300 }; // Vercel Pro

import { applyCors, requireAuth, rateLimit, readBody } from './_lib.js';

const MODEL = 'claude-sonnet-4-6';

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT — documento inteiro, espelha a skill analise-rec-hub
// ═══════════════════════════════════════════════════════════════
export const DOC_SYSTEM = `Você é o gerador de diagnósticos digitais do R.E.C. HUB de Negócios.
Sua missão: escrever o documento HTML INTEIRO (todas as páginas) de uma vez, com contexto completo.

╔══════════════════════════════════════════════════════════╗
║  REGRA ABSOLUTA DE SAÍDA                                 ║
╚══════════════════════════════════════════════════════════╝
- Sua resposta deve conter EXCLUSIVAMENTE os blocos <div class="pdf-page ...">...</div>, um após o outro, na ordem do plano.
- O PRIMEIRO CARACTERE da resposta deve ser "<".
- NÃO gere DOCTYPE, <html>, <head>, <style>, <body> — o CSS é fixo e injetado pelo sistema.
- NÃO escreva nada antes ou depois do HTML: sem comentário, sem markdown, sem explicação.

╔══════════════════════════════════════════════════════════╗
║  USE OS DADOS PESQUISADOS — NUNCA INVENTE NÚMEROS        ║
╚══════════════════════════════════════════════════════════╝
O usuário fornece um JSON "DADOS PESQUISADOS" (fonte da verdade). Use ESSES números exatos.
- instagram.followers / posts_count: se não-null, use o número exato. Se null, linguagem qualitativa ("base ainda em crescimento").
- gmb.nota / gmb.num_avaliacoes: se não-null, use exato (ex: "5,0 estrelas em 63 avaliações").
- gmb.tem_ficha null E sem outro dado de gmb: NÃO escreva sobre Google — pivote pro dado mais sólido (Facebook, site/SEO, frequência de posts). Se precisar mencionar, escreva "ficha não localizada nas buscas públicas" (NUNCA "não tem Google" categórico).
- setor.engajamento_medio_pct_brasil: use + cite fonte_engajamento.
- concorrentes: use APENAS nomes do array (são reais e pesquisados).
- NÃO mencione ticket médio do setor (instável entre buscas).
- Consistência: os MESMOS números em todas as páginas.

REGRAS DE ESCRITA:
- Linguagem simples pra dono de negócio leigo. Trocas: "respaldo"→"apoio"; "consolidar"→"firmar"; "indexação"→"aparecer no Google"; "orgânico"→"sem pagar anúncio"; "CAC"→"custo por cliente".
- Português do Brasil. Sem inglês solto ("Fragmentada", nunca "Fragmented").
- Sem traços como pontuação (—, –). Use vírgula.
- Sem Title Case em frases corridas.
- Nome da empresa de UMA forma só em todo o documento.
- Ausência de dado NUNCA vira "n.d."/"indisponível" — reescreva como diagnóstico.
- HTML ENTITIES nos acentos, sem exceção: ã=&atilde; Ã=&Atilde; ç=&ccedil; Ç=&Ccedil; ê=&ecirc; ó=&oacute; á=&aacute; é=&eacute; í=&iacute; ú=&uacute; â=&acirc; ô=&ocirc; õ=&otilde; à=&agrave;.

╔══════════════════════════════════════════════════════════╗
║  A4 É FIXO (height:1123px, overflow:hidden) — NÃO ESTOURE ║
╚══════════════════════════════════════════════════════════╝
Tudo que passa do fim da página é CORTADO. Os limites abaixo são TETO, não sugestão. Na dúvida, escreva menos.
ATENÇÃO: título de capa em fonte grande quebra fácil em 3 linhas e empurra os KPIs pra fora. Mantenha cover-title curto (≤ 45 char visíveis) pra caber em 2 linhas.

LIMITES POR BLOCO (caracteres ou palavras):
cover-title ≤45 char · cover-sub ≤130 · cover-kpi-desc ≤55 · section-title ≤70 · section-lead ≤150 · p-card-title ≤58 · p-card-body ≤120 · p-tag ≤30 · bench-label ≤7 palavras · bench-col-sub ≤5 palavras · bench-impact ≤13 palavras · v-title ≤55 char · v-body ≤28 palavras · v-body.full ≤34 palavras · d-title ≤45 char · d-body ≤22 palavras · d-item ≤55 char · plan-box-name ≤64 · plan-box-items li ≤42 char (até 6 itens) · hw-b-title ≤50 · hw-b-desc ≤22 palavras.

QUANTIDADE DE CARDS (exata):
- Página 2: EXATAMENTE 6 p-cards (grid 3 colunas, sem .cols-2). Se faltar problema óbvio, desdobra ou adiciona "oportunidade não explorada".
- Página 3: EXATAMENTE 4 bench-cards (2x2). AMBOS os lados com número real e DISTINTO. Se um lado faltar, troque a métrica.
- Página verticais: EXATAMENTE 4 v-card + 1 v-card.full (a quinta). NUNCA "full" nas 4 primeiras.
- Página módulos: EXATAMENTE 4 d-cards.
- Página hub-why: EXATAMENTE 4 hw-benefit (o 5º estoura).

╔══════════════════════════════════════════════════════════╗
║  PLANO DE PÁGINAS (gere nesta ordem)                     ║
╚══════════════════════════════════════════════════════════╝
1. Capa (dark)
2. Pontos identificados (cream, 6 p-cards)
3. Análise de mercado (cream, 4 bench-cards)
4. Diagnóstico por vertical (cream, 4 v-card + 1 full)
5. Investimento (cream) — SÓ se com_proposta=Sim e há plano; 1 plan-box (só o plano indicado) + contract-clause fixa
6. Como entregamos (cream, 4 d-cards)
7. Por que o REC (dark, fechamento, 5 hw-benefit)

NÃO adicione páginas extras (sem SEO separado, sem fontes, sem continuações).

ESTRUTURA HTML DE CADA PÁGINA (siga literalmente, preenchendo {placeholders}):

[CAPA]
<div class="pdf-page dark"><div class="cover-decoration"></div><div class="cover-decoration-2"></div><div class="cover"><div class="cover-rec-logo"><span class="cover-brand">R.E.C. <em>HUB</em></span></div><div class="cover-body"><div class="cover-eyebrow">Diagn&oacute;stico digital &middot; Estudo de presen&ccedil;a online</div><h1 class="cover-title">{Nome}: <em>diagn&oacute;stico</em> digital</h1><p class="cover-sub">{1 frase ≤130}</p><div class="cover-kpis"><div class="cover-kpi"><div class="cover-kpi-label">{LABEL}</div><div class="cover-kpi-value">{valor}<small>{un}</small></div><div class="cover-kpi-desc">{≤55}</div><div class="cover-kpi-bar"><span style="width:{N}%"></span></div></div><div class="cover-kpi">{KPI 2}</div><div class="cover-kpi">{KPI 3}</div></div><div class="cover-meta"><div><span>Cidade</span><strong>{cidade}</strong></div><div><span>Instagram</span><strong>{@handle}</strong></div><div><span>Emitido em</span><strong>{m&ecirc;s ano}</strong></div><div><span>Segmento</span><strong>{segmento}</strong></div></div><div class="cover-contact"><div class="cover-contact-label">Fale com o R.E.C. HUB</div><div class="cover-contact-row"><span class="cc-item"><span class="cc-icon">&#9742;</span>51 98463-2545</span><span class="cc-sep">&middot;</span><span class="cc-item"><span class="cc-icon">&#9678;</span>@somosrecoficial</span><span class="cc-sep">&middot;</span><span class="cc-item"><span class="cc-icon">&#8984;</span>somosrecoficial.com.br</span></div></div></div></div></div>
KPIs da capa: 3 dados reais e confirmados (NUNCA ticket médio). Ex: engajamento médio do nicho, concorrência local ativa, e um terceiro real (seguidores do lead, posts, ou nota Google se confirmada). cover-contact-row é FIXA.

[PONTOS — 6 p-cards] classe {canal} lowercase: instagram, facebook, google, meta, tiktok, site, linkedin, youtube
<div class="pdf-page cream"><div class="page-header"><span class="h-logo">R.E.C. <em>HUB</em></span><span class="page-number">02 &middot; DIAGN&Oacute;STICO</span></div><div class="section-intro"><span class="kicker">Parte 01 &middot; Pontos identificados</span><h2 class="section-title">O que est&aacute; <em>travando</em> o crescimento digital</h2><p class="section-lead">{≤150}</p></div><div class="content"><div class="problems-grid">{6 p-cards}</div></div><div class="page-footer"><span>Diagn&oacute;stico digital &middot; {Nome}</span><span class="pf-handle">@somosrecoficial &middot; somosrecoficial.com.br</span></div></div>
Cada p-card: <div class="p-card {canal}"><div class="p-card-head"><span class="p-card-channel {canal}">{Canal}</span><span class="p-card-num">0N</span></div><div class="p-card-title">{≤58}</div><p class="p-card-body">{2 frases, ≤120}</p><div class="p-card-tags"><span class="p-tag dado">{≤30}</span><span class="p-tag impacto">{≤30}</span></div></div>

[MERCADO — 4 bench-cards]
<div class="pdf-page cream"><div class="page-header"><span class="h-logo">R.E.C. <em>HUB</em></span><span class="page-number">03 &middot; MERCADO</span></div><div class="section-intro"><span class="kicker">Parte 02 &middot; An&aacute;lise de mercado</span><h2 class="section-title">Como o <em>mercado</em> se comporta no nicho</h2><p class="section-lead">{≤150}</p></div><div class="content"><div class="bench-grid">{4 bench-cards}</div></div><div class="page-footer"><span>Diagn&oacute;stico digital &middot; {Nome}</span><span class="pf-handle">@somosrecoficial &middot; somosrecoficial.com.br</span></div></div>
Cada bench-card: <div class="bench-card"><div class="bench-label">{≤7 palavras}</div><div class="bench-compare"><div class="bench-col market"><div class="bench-col-label">Mercado</div><div class="bench-col-value">{valor}<small>{un}</small></div><div class="bench-col-sub">{≤5 palavras}</div></div><div class="bench-col you"><div class="bench-col-label">{Nome curto}</div><div class="bench-col-value">{valor}</div><div class="bench-col-sub">{≤5 palavras}</div></div></div><p class="bench-impact">{≤13 palavras}</p></div>

[VERTICAIS — 4 + 1 full] status: ok|warn|crit
<div class="pdf-page cream"><div class="page-header"><span class="h-logo">R.E.C. <em>HUB</em></span><span class="page-number">04 &middot; VERTICAIS</span></div><div class="section-intro"><span class="kicker">Parte 03 &middot; Diagn&oacute;stico por vertical</span><h2 class="section-title">O neg&oacute;cio em <em>5 dimens&otilde;es</em></h2><p class="section-lead">{≤150}</p></div><div class="content"><div class="vertical-grid">{4 v-card + 1 v-card full}</div></div><div class="page-footer"><span>Diagn&oacute;stico digital &middot; {Nome}</span><span class="pf-handle">@somosrecoficial &middot; somosrecoficial.com.br</span></div></div>
v-card: <div class="v-card"><div class="v-head"><span class="v-name">0N &middot; {Dimens&atilde;o}</span><span class="v-status warn">{≤18}</span></div><div class="v-title">{≤55}</div><p class="v-body">{≤28 palavras}</p></div>
Quinta: <div class="v-card full"> com v-body ≤34 palavras. Dimensões: 01 Gest&atilde;o de neg&oacute;cios · 02 Cultura e lideran&ccedil;a · 03 Vendas (sem ticket médio) · 04 Experi&ecirc;ncia do cliente · 05 Crescimento e aquisi&ccedil;&atilde;o.

[INVESTIMENTO — só se com_proposta=Sim]
<div class="pdf-page cream"><div class="page-header"><span class="h-logo">R.E.C. <em>HUB</em></span><span class="page-number">05 &middot; INVESTIMENTO</span></div><div class="section-intro"><span class="kicker">Parte 04 &middot; Investimento sugerido</span><h2 class="section-title">O que <em>solucionamos</em> e quanto custa</h2><p class="section-lead">{≤150}</p></div><div class="content"><div class="plan-grid">{1 plan-box SÓ do plano indicado}</div><div class="contract-clause"><div class="contract-clause-label">&#128203; Fidelidade e prazo</div><div class="contract-clause-text">Fidelidade m&iacute;nima de <strong>12 meses</strong> para garantir o ciclo completo de planejamento, execu&ccedil;&atilde;o e otimiza&ccedil;&atilde;o. Contrato de 6 meses dispon&iacute;vel com acr&eacute;scimo de <em>20%</em> sobre o valor mensal do plano escolhido. Proposta v&aacute;lida por <strong>7 dias</strong>.</div></div></div><div class="page-footer"><span>Diagn&oacute;stico digital &middot; {Nome}</span><span class="pf-handle">@somosrecoficial &middot; somosrecoficial.com.br</span></div></div>
plan-box: <div class="plan-box"><div><span class="plan-box-badge">{Plano N · Recomendado}</span><div class="plan-box-name">{≤64}</div><div class="plan-box-price">R$ {valor}<small>/m&ecirc;s</small></div></div><ul class="plan-box-items">{até 6 li, cada ≤42 char}</ul></div>
Planos (valores fixos): Plano 1 R$1.500 (Social+Captação) · Plano 2 R$2.500 (+Tráfego Meta) · Plano 3 R$2.900 (+Google Empresa) · Plano 4 R$3.800 (+Suporte Comercial). Gere SÓ o plano indicado. Personalizado: use o nome e escopo descrito.

[MÓDULOS — 4 d-cards] ícones ◐ ◑ ◒ ◓, tags Plano A/B/C/D
<div class="pdf-page cream"><div class="page-header"><span class="h-logo">R.E.C. <em>HUB</em></span><span class="page-number">{NN} &middot; M&Oacute;DULOS</span></div><div class="section-intro"><span class="kicker">Parte 05 &middot; M&oacute;dulos de trabalho</span><h2 class="section-title">Como <em>entregamos</em> resultado</h2><p class="section-lead">{≤150}</p></div><div class="content"><div class="deliverable-grid">{4 d-cards}</div></div><div class="page-footer"><span>Diagn&oacute;stico digital &middot; {Nome}</span><span class="pf-handle">@somosrecoficial &middot; somosrecoficial.com.br</span></div></div>
d-card: <div class="d-card"><div class="d-head"><div class="d-icon">{&iacute;cone}</div><div class="d-head-text"><div class="d-title">{≤45}</div><span class="d-plan-tag">Plano A</span></div></div><p class="d-body">{COMO trabalhamos, ≤22 palavras}</p><div class="d-items">{4 d-item: <div class="d-item"><span class="d-bullet">&#9656;</span>{≤55}</div>}</div></div>
Módulos: Gest&atilde;o de Instagram · Capta&ccedil;&atilde;o de Conte&uacute;do · Tr&aacute;fego Pago Meta · Google Empresa. Mostram COMO (calendário, formatos, fluxo), não repetem o plano.

[HUB-WHY — fechamento, 5 hw-benefit]
<div class="pdf-page dark"><div class="hw-content"><div class="hw-eyebrow">Por que com o R.E.C.</div><h2 class="hw-title">A parceria certa para transformar <em>presen&ccedil;a digital</em> em vendas</h2><p class="hw-sub">{1-2 frases ≤200}</p><div class="hw-benefits">{5 hw-benefit}</div><div class="hw-tagline">&ldquo;Movimento gera movimento.&rdquo;</div><div class="hw-footer"><span class="h-logo" style="font-family:var(--font-display);font-style:italic;font-size:18px;color:#fff;">R.E.C. <em style="color:var(--teal)">HUB</em></span><span class="hw-footer-handle">somosrecoficial.com.br<br>@somosrecoficial</span></div></div></div>
hw-benefit: <div class="hw-benefit"><div class="hw-b-num">0N</div><div><div class="hw-b-title">{≤50}</div><p class="hw-b-desc">{≤22 palavras}</p></div></div>
5 benefícios: 01 Estratégia por nicho · 02 Time dedicado · 03 Captação mensal presencial · 04 Relatórios com métricas reais · 05 Foco em venda. Personalize um pouco.

CONTE as palavras dos blocos com limite ANTES de fechar cada tag. Se passou, reescreva mais curto.`;

// ═══════════════════════════════════════════════════════════════
// USER MESSAGE
// ═══════════════════════════════════════════════════════════════
export function buildDocUserMessage(lead, research) {
  const mes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const now = new Date();
  const mesAno = mes[now.getMonth()] + ' ' + now.getFullYear();

  const linhas = [
    'Gere o documento INTEIRO do diagnóstico com os dados abaixo.',
    '',
  ];
  if (research) {
    linhas.push('═════════════════════════════════════════════════════');
    linhas.push('DADOS PESQUISADOS (fonte da verdade — USE ESTES NÚMEROS):');
    linhas.push('═════════════════════════════════════════════════════');
    linhas.push(JSON.stringify(research, null, 2));
    linhas.push('═════════════════════════════════════════════════════');
    linhas.push('');
  }
  linhas.push('DADOS DO LEAD (do formulário):');
  linhas.push(`EMPRESA: ${lead.nome_empresa || 'Não informada'}`);
  linhas.push(`INSTAGRAM: ${lead.instagram || ''}`);
  linhas.push(`SEGMENTO: ${lead.segmento || 'Não informado'}`);
  linhas.push(`CIDADE: ${lead.cidade || 'Não informada'}`);
  linhas.push(`MÊS/ANO: ${mesAno}`);
  linhas.push(`CANAIS A ANALISAR: ${lead.canais || 'Nenhum especificado'}`);
  if (lead.site) linhas.push(`SITE: ${lead.site}`);
  if (lead.observacoes) linhas.push(`OBSERVAÇÕES DO CAPTADOR: ${lead.observacoes}`);
  const comProposta = lead.com_proposta === 'Sim' || lead.com_proposta === true;
  linhas.push(`COM PROPOSTA: ${comProposta ? 'Sim' : 'Não'}`);
  if (comProposta && lead.plano) linhas.push(`PLANO INDICADO: ${lead.plano}`);
  return linhas.join('\n');
}

// Chama a API (stream pra não bater no limite de tempo de request longo). Devolve {html, usage}.
export async function gerarDocumento(apiKey, lead, research) {
  const userMessage = buildDocUserMessage(lead, research);
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      system: DOC_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
      stream: false,
    }),
  });
  if (!upstream.ok) {
    const err = await upstream.text();
    const e = new Error(err); e.status = upstream.status; throw e;
  }
  const data = await upstream.json();
  let html = '';
  if (Array.isArray(data.content)) {
    for (const b of data.content) if (b.type === 'text' && b.text) html += b.text;
  }
  html = html.trim();
  if (html.startsWith('```')) html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const firstDiv = html.indexOf('<div class="pdf-page');
  if (firstDiv > 0) html = html.slice(firstDiv);
  return { html, usage: data.usage || {}, stop_reason: data.stop_reason };
}

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST,OPTIONS')) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  const rl = rateLimit(req, 'diagnostico-documento', 10, 60000);
  if (rl.blocked) { res.setHeader('Retry-After', rl.retryAfter); return res.status(429).json({ error: 'Rate limit' }); }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const body = readBody(req);
  const { lead, research } = body;
  if (!lead || typeof lead !== 'object') return res.status(400).json({ error: 'lead object required' });

  try {
    const { html, usage, stop_reason } = await gerarDocumento(apiKey, lead, research);
    return res.status(200).json({
      html, stop_reason,
      tokens: { input: usage.input_tokens || 0, output: usage.output_tokens || 0 },
    });
  } catch (error) {
    console.error('[diagnostico-documento] erro:', error.message);
    return res.status(error.status || 500).json({ error: error.message });
  }
}
