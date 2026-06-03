// Gera UMA página do diagnóstico R.E.C. HUB por vez.
// Substitui /api/claude (que tentava gerar tudo em uma chamada e truncava).
// Arquitetura page-by-page: cliente faz 6-10 chamadas paralelas, monta no fim.

export const config = { maxDuration: 60 };

import { applyCors, requireAuth, rateLimit, readBody } from './_lib.js';

// Modelo único do diagnóstico. Trocar aqui afeta TODAS as páginas.
// Haiku 4.5 ($1/$5) + extended thinking = barato, mas "pensa" antes de escrever
// (segue limites e estrutura melhor). Opções: 'claude-haiku-4-5-20251001' |
// 'claude-sonnet-4-6' ($3/$15) | 'claude-opus-4-8' ($5/$25)
const MODEL = 'claude-haiku-4-5-20251001';
// Orçamento de raciocínio interno por página. Sai do max_tokens; não vira HTML.
const THINKING_BUDGET = 1500;

// ═══════════════════════════════════════════════════════════════
// REGRAS UNIVERSAIS — incluídas em TODOS os prompts
// ═══════════════════════════════════════════════════════════════
const REGRAS_BASE = `╔══════════════════════════════════════════════════════════╗
║  REGRA ABSOLUTA DE SAÍDA                                ║
╚══════════════════════════════════════════════════════════╝
Sua resposta deve conter EXCLUSIVAMENTE tags HTML.
O PRIMEIRO CARACTERE da resposta deve ser "<" (abertura de tag).
NÃO escreva nada antes ou depois do HTML — nenhum comentário, nenhuma explicação.
NÃO use markdown, NÃO gere DOCTYPE/html/head/style/body.
Gere APENAS o div.pdf-page solicitado e seus filhos.

╔══════════════════════════════════════════════════════════╗
║  USE OS DADOS DA PESQUISA — NÃO INVENTE NÚMEROS         ║
╚══════════════════════════════════════════════════════════╝
O usuário fornecerá um objeto JSON "DADOS PESQUISADOS" com fatos verificados.
USE ESSES NÚMEROS EXATOS em qualquer métrica que você citar.
- Se "instagram.followers" não for null, use ESSE número exato (jamais invente)
- Se for null, use linguagem qualitativa: "base ainda em crescimento", "presença modesta", etc
- Se "gmb.nota" e "gmb.num_avaliacoes" não forem null, use ESSES números exatos (ex: "5,0 ★ em 63 avaliações")
- Se "gmb.tem_ficha" for false ou null, escreva "ficha não localizada publicamente" — NUNCA assuma que não existe
- Para benchmarks de setor, use "setor.engajamento_medio_pct_brasil" e cite "fonte_engajamento"
- Para ticket, use o range de "setor.ticket_medio_brl_min" a "setor.ticket_medio_brl_max"
- Para concorrentes, use APENAS nomes do array "concorrentes" (são reais e pesquisados)
- Mantenha consistência: TODAS as páginas usarão o mesmo JSON, números devem bater

REGRAS DE ESCRITA:
- LINGUAGEM SIMPLES: escreva como quem explica para um dono de negócio leigo, não para um especialista. Prefira a palavra comum à palavra difícil. EVITE termos rebuscados ou jargão de marketing sem explicar. Exemplos a evitar e o que usar no lugar: "respaldo"→"apoio"; "consolidar"→"firmar"; "atrito de compra"→"barreira para comprar"; "indexação"→"aparecer no Google"; "autoridade de domínio"→"força do site no Google"; "vanity metrics"→"números que não geram venda"; "orgânico"→"sem pagar anúncio". Frases curtas e diretas.
- TEXTO CURTO: respeite os limites de cada bloco. É MELHOR escrever menos do que estourar — texto que passa do limite é CORTADO no PDF (página A4 fixa). Na dúvida, escreva mais curto.
- Sem traços como pontuação (—, –). Use vírgula ou reescreva.
- NOME DA EMPRESA: escreva o nome de UMA ÚNICA forma em TODO o texto, exatamente como aparece no pedido. NUNCA varie acentuação ou grafia, NUNCA adicione/remova cidade ou palavras (ex.: não alterne entre "Italinea", "Italinéa", "Italinea Canoas").
- AUSÊNCIA DE DADO: quando não houver dado público de uma métrica, NUNCA escreva "não retornou dados", "indisponível", "não identificado" ou "não encontrado". Reescreva como diagnóstico: troque "velocidade indisponível" por "site sem otimização técnica visível"; "backlinks não identificados" por "site ainda sem referências que o Google valorize". Transforme a ausência em oportunidade, sem soar como auditoria que não foi feita.
- TERMOS EM PORTUGUÊS: nunca deixe palavras em inglês soltas (ex.: escreva "Fragmentada", nunca "Fragmented").
- ORTOGRAFIA: revise. Correto: "captação" (não "capção"), "rastreável" (não "rastrecável"), "conteúdo" (não "contéudo"), "desnecessariamente" (não "desnecessáriamente").
- Sem title case em frases corridas.
- HTML entities para acentos: ã=&atilde; ç=&ccedil; ê=&ecirc; ó=&oacute; á=&aacute; é=&eacute; í=&iacute; ú=&uacute; â=&acirc; ô=&ocirc; õ=&otilde;
- Tom direto, profissional, embasado em DADOS PESQUISADOS.
- SEMPRE cite fontes quando usar números: "0,6% (mLabs 2024)" ou "R$ 3.600 a R$ 30.000 (Cronoshare)"
- Para destaque em h1/h2/section-title: use <em>palavra</em> nos pontos-chave.
- LIMITE de texto por elemento: respeite os caracteres máximos para evitar overflow visual no PDF.

PALETA REC (já no CSS):
navy var(--blue), teal var(--teal), cream var(--cream).
Tipografia: Fraunces (display), Manrope (body), Space Grotesk (números).`;

// ═══════════════════════════════════════════════════════════════
// CONFIGS POR PÁGINA
// ═══════════════════════════════════════════════════════════════
const PAGES = {

  // ════════════════════════ COVER ════════════════════════
  cover: {
    max_tokens: 3000,
    system: `${REGRAS_BASE}

VOCÊ GERA APENAS A PÁGINA DE CAPA (dark, navy).

ESTRUTURA OBRIGATÓRIA — copie exatamente, preenchendo {placeholders}:

<div class="pdf-page dark">
<div class="cover-decoration"></div>
<div class="cover-decoration-2"></div>
<div class="cover">
<div class="cover-rec-logo"><img src="" alt="R.E.C."><span class="cover-brand">R.E.C. <em>HUB</em></span></div>
<div class="cover-body">
<div class="cover-eyebrow">Diagn&oacute;stico digital · Estudo de presen&ccedil;a online</div>
<h1 class="cover-title">{título com <em>destaque em italic</em>, ≤80 char total}</h1>
<p class="cover-sub">{1 frase explicando o documento, ≤140 char}</p>
<div class="cover-kpis">
<div class="cover-kpi"><div class="cover-kpi-label">{LABEL, ≤28}</div><div class="cover-kpi-value">{valor}<small>{unit}</small></div><div class="cover-kpi-desc">{contexto vs mercado, ≤110}</div><div class="cover-kpi-bar"><span style="width:{N}%"></span></div></div>
<div class="cover-kpi">{outro KPI no mesmo padrão}</div>
<div class="cover-kpi">{outro KPI no mesmo padrão}</div>
</div>
<div class="cover-meta">
<div><span>Cidade</span><strong>{cidade}</strong></div>
<div><span>Instagram</span><strong>{@handle}</strong></div>
<div><span>Emitido em</span><strong>{m&ecirc;s ano}</strong></div>
<div><span>Segmento</span><strong>{segmento}</strong></div>
</div>
<div class="cover-contact">
<div class="cover-contact-label">Fale com o R.E.C. HUB</div>
<div class="cover-contact-row">
<span class="cc-item"><span class="cc-icon">✆</span>51 98463-2545</span>
<span class="cc-sep">·</span>
<span class="cc-item"><span class="cc-icon">◎</span>@somosrecoficial</span>
<span class="cc-sep">·</span>
<span class="cc-item"><span class="cc-icon">⌘</span>somosrecoficial.com.br</span>
</div>
</div>
</div>
</div>
</div>

KPIs OBRIGATÓRIOS (use dados do setor brasileiro do nicho informado):
1. Engajamento médio do Instagram no nicho (% ou número)
2. Concorrência local ativa (quantidade de perfis fortes ou concorrentes notórios)
3. Ticket médio do nicho (R$ ou faixa) — escolha o KPI mais relevante para o segmento

A cover-contact-row é FIXA — não altere os contatos.
A img src="" será preenchida pelo sistema.`,
  },

  // ════════════════════════ PROBLEMS-1 ════════════════════════
  'problems-1': {
    max_tokens: 3500,
    system: `${REGRAS_BASE}

VOCÊ GERA APENAS A PÁGINA 2 — PARTE 1 DE PONTOS IDENTIFICADOS (cream).

ESTRUTURA OBRIGATÓRIA:

<div class="pdf-page cream">
<div class="page-header"><span class="h-logo">R.E.C. <em>HUB</em></span><span class="page-number">{NN} · DIAGN&Oacute;STICO</span></div>
<div class="section-intro">
<span class="kicker">Parte 01 · Pontos identificados</span>
<h2 class="section-title">{título com <em>destaque</em>, ≤80}</h2>
<p class="section-lead">{1-2 frases contextualizando, ≤220}</p>
</div>
<div class="content">
<div class="problems-grid{[ cols-2 se 3+ canais informados, senão omitir]}">
{p-cards}
</div>
</div>
<div class="page-footer"><span>Diagn&oacute;stico digital · {nome empresa}</span><span class="pf-handle">@somosrecoficial · somosrecoficial.com.br</span></div>
</div>

QUANTIDADE de p-cards:
- Se canais ≤ 2: EXATAMENTE 6 cards (grid 3 cols default, sem .cols-2)
- Se canais ≥ 3: EXATAMENTE 4 cards (grid 2x2 com class="problems-grid cols-2")

CARDS devem cobrir DIFERENTES canais informados. Se houver 3+ canais, distribua: 1 card por canal e os extras pegam os mais problemáticos.

Estrutura de cada p-card:
<div class="p-card {canal}">
<div class="p-card-head"><span class="p-card-channel {canal}">{Canal}</span><span class="p-card-num">{NN}</span></div>
<div class="p-card-title">{título do problema específico, ≤70 char}</div>
<p class="p-card-body">{EXATAMENTE 2 frases curtas e simples, com 1 dado concreto, ≤160 char no total}</p>
<div class="p-card-tags"><span class="p-tag dado">{dado quantitativo, ≤35}</span><span class="p-tag impacto">{consequência, ≤35}</span></div>
</div>

CHECAGEM CRÍTICA: p-card-body NUNCA pode passar de 160 caracteres (cerca de 26 palavras). Conte antes de fechar a tag. Se passar, REESCREVA mais curto. Texto longo demais é CORTADO no PDF.

Classes {canal} (use lowercase): instagram, facebook, google, meta, tiktok, site, linkedin, youtube.`,
  },

  // ════════════════════════ PROBLEMS-2 ════════════════════════
  'problems-2': {
    max_tokens: 3500,
    system: `${REGRAS_BASE}

VOCÊ GERA APENAS A PÁGINA 3 — CONTINUAÇÃO DE PONTOS IDENTIFICADOS (cream).

ESTRUTURA OBRIGATÓRIA:

<div class="pdf-page cream">
<div class="page-header"><span class="h-logo">R.E.C. <em>HUB</em></span><span class="page-number">{NN} · DIAGN&Oacute;STICO</span></div>
<div class="section-intro">
<span class="kicker">Parte 01 · Pontos identificados · continua&ccedil;&atilde;o</span>
<h2 class="section-title">{novo título com <em>destaque</em>, ≤80}</h2>
<p class="section-lead">{1-2 frases, ≤220}</p>
</div>
<div class="content">
<div class="problems-grid cols-2">
{EXATAMENTE 4 p-cards, numerados 05-08}
</div>
</div>
<div class="page-footer"><span>Diagn&oacute;stico digital · {nome empresa}</span><span class="pf-handle">@somosrecoficial · somosrecoficial.com.br</span></div>
</div>

Mesma estrutura de p-card que problems-1, COM O MESMO LIMITE: p-card-body = EXATAMENTE 2 frases curtas e simples, ≤160 caracteres (cerca de 26 palavras). NUNCA passe disso — texto longo é cortado no PDF. Aborde aspectos diferentes dos canais (funil de conversão, criativos, retargeting, SEO, etc).`,
  },

  // ════════════════════════ MERCADO ════════════════════════
  mercado: {
    max_tokens: 3500,
    system: `${REGRAS_BASE}

VOCÊ GERA APENAS A PÁGINA DE ANÁLISE DE MERCADO (cream, parte 02).

ESTRUTURA OBRIGATÓRIA:

<div class="pdf-page cream">
<div class="page-header"><span class="h-logo">R.E.C. <em>HUB</em></span><span class="page-number">{NN} · MERCADO</span></div>
<div class="section-intro">
<span class="kicker">Parte 02 · An&aacute;lise de mercado</span>
<h2 class="section-title">Como o <em>mercado</em> se comporta no nicho</h2>
<p class="section-lead">{contexto com referência a concorrentes reais, ≤220}</p>
</div>
<div class="content">
<div class="bench-grid">
{EXATAMENTE 4 bench-cards}
</div>
</div>
<div class="page-footer"><span>Diagn&oacute;stico digital · {nome empresa}</span><span class="pf-handle">@somosrecoficial · somosrecoficial.com.br</span></div>
</div>

CONCORRENTES: use APENAS nomes do array research.concorrentes (já pesquisados e reais).

Estrutura bench-card (LIMITES APERTADOS para caber 4 cards em 2x2 em A4):
<div class="bench-card">
<div class="bench-label">{título da métrica, máx 8 palavras}</div>
<div class="bench-compare">
<div class="bench-col market"><div class="bench-col-label">Mercado · {fonte curta, máx 3 palavras}</div><div class="bench-col-value">{valor}<small> {unit}</small></div><div class="bench-col-sub">{contexto, máx 6 palavras}</div></div>
<div class="bench-col you"><div class="bench-col-label">{nome empresa, máx 3 palavras}</div><div class="bench-col-value">{valor}<small> {unit}</small></div><div class="bench-col-sub">{contexto, máx 6 palavras}</div></div>
</div>
<div class="bench-impact">{insight em 1 frase, M&Aacute;XIMO 18 palavras — ver regra abaixo}</div>
</div>

REGRA DE TAMANHO PARA bench-impact — CR&Iacute;TICO:
EXATAMENTE 1 frase. M&aacute;ximo 18 palavras. Nunca 2 frases. Nunca par&aacute;grafo.
EXEMPLO BOM (15 palavras): "Sem indexa&ccedil;&atilde;o p&uacute;blica, a marca perde visibilidade org&acirc;nica frente a concorrentes j&aacute; estabelecidos em Canoas."
EXEMPLO RUIM (28 palavras — REJEITAR): "Sem volume de posts e seguidores rastre&aacute;veis, &eacute; imposs&iacute;vel avaliar se o conte&uacute;do gera retorno real. Benchmark de refer&ecirc;ncia: 0,36% (mLabs fev/2026)."

CHECAGEM: conte palavras antes de fechar </div>. Se &gt; 18, REESCREVA.

Métricas obrigatórias (uma por bench-card):
1. Seguidores médios do nicho vs lead (use research.instagram.followers)
2. Engajamento médio (use research.setor.engajamento_medio_pct_brasil + research.instagram.engajamento_estimado_pct)
3. Presença concorrentes locais (use research.concorrentes)
4. Ticket médio ou CAC (use research.setor.ticket_medio_brl_central ou cac_estimado)`,
  },

  // ════════════════════════ MERCADO-CONT ════════════════════════
  'mercado-cont': {
    max_tokens: 3000,
    system: `${REGRAS_BASE}

VOCÊ GERA APENAS A PÁGINA DE CONTINUAÇÃO DE MERCADO (cream).

ESTRUTURA OBRIGATÓRIA:

<div class="pdf-page cream">
<div class="page-header"><span class="h-logo">R.E.C. <em>HUB</em></span><span class="page-number">{NN} · MERCADO</span></div>
<div class="section-intro">
<span class="kicker">Parte 02 · An&aacute;lise de mercado · continua&ccedil;&atilde;o</span>
<h2 class="section-title">E como o <em>p&uacute;blico</em> se comporta</h2>
<p class="section-lead">{1-2 frases sobre comportamento do consumidor, ≤220}</p>
</div>
<div class="content">
<div class="bench-grid">
{EXATAMENTE 2 bench-cards}
</div>
<div class="opp-strip">
<div class="opp-strip-icon">◆</div>
<div class="opp-strip-body">
<h3>{título da oportunidade, ≤60}</h3>
<p>{descrição de oportunidade concreta, ≤220}</p>
</div>
</div>
</div>
<div class="page-footer"><span>Diagn&oacute;stico digital · {nome empresa}</span><span class="pf-handle">@somosrecoficial · somosrecoficial.com.br</span></div>
</div>

Os 2 bench-cards devem cobrir comportamento de PÚBLICO: tempo de resposta DM, jornada de compra, recompra, etc. DIFERENTES dos 4 da página anterior. Mesma estrutura de bench-card.`,
  },

  // ════════════════════════ VERTICAIS ════════════════════════
  verticais: {
    max_tokens: 3500,
    system: `${REGRAS_BASE}

VOCÊ GERA APENAS A PÁGINA DAS 5 VERTICAIS DO NEGÓCIO (cream, parte 03).

ESTRUTURA OBRIGATÓRIA:

<div class="pdf-page cream">
<div class="page-header"><span class="h-logo">R.E.C. <em>HUB</em></span><span class="page-number">{NN} · VERTICAIS</span></div>
<div class="section-intro">
<span class="kicker">Parte 03 · Diagn&oacute;stico por vertical</span>
<h2 class="section-title">O neg&oacute;cio em <em>5 dimens&otilde;es</em></h2>
<p class="section-lead">{contexto sobre análise multidimensional, ≤220}</p>
</div>
<div class="content">
<div class="vertical-grid">
{4 v-cards normais + 1 com class="v-card full"}
</div>
</div>
<div class="page-footer"><span>Diagn&oacute;stico digital · {nome empresa}</span><span class="pf-handle">@somosrecoficial · somosrecoficial.com.br</span></div>
</div>

5 VERTICAIS (na ordem exata):
01 · Gest&atilde;o de Neg&oacute;cios — estrutura operacional, processos, eficiência
02 · Cultura e Lideran&ccedil;a — posicionamento, identidade, presença do líder
03 · Vendas — canais, funil, ticket médio, recorrência
04 · Experi&ecirc;ncia do Cliente — avaliações, atendimento, NPS estimado
05 · Crescimento &amp; Aquisi&ccedil;&atilde;o — presença digital, escala

ESTRUTURA HTML CR&Iacute;TICA — siga LITERALMENTE este padr&atilde;o:

<div class="vertical-grid">
  <div class="v-card">    ← VERTICAL 01 (SEM class full)
    <div class="v-head">...</div>
    <div class="v-title">...</div>
    <p class="v-body">...</p>
  </div>
  <div class="v-card">    ← VERTICAL 02 (SEM class full)
    ...
  </div>
  <div class="v-card">    ← VERTICAL 03 (SEM class full)
    ...
  </div>
  <div class="v-card">    ← VERTICAL 04 (SEM class full)
    ...
  </div>
  <div class="v-card full">   ← APENAS VERTICAL 05 LEVA class="v-card full"
    ...
  </div>
</div>

REGRA ABSOLUTA: exatamente 4 cards com class="v-card" + 1 card com class="v-card full".
NUNCA coloque "full" nas verticais 01, 02, 03 ou 04. NUNCA esque&ccedil;a "full" na 05.

Cada v-card cont&eacute;m:
<div class="v-head"><span class="v-name">{NN} · {Nome Vertical}</span><span class="v-status {ok|warn|crit}">{label, ≤18}</span></div>
<div class="v-title">{diagnóstico em 1 frase, ≤72}</div>
<p class="v-body">{texto seguindo regra abaixo}</p>

REGRA DE TAMANHO PARA v-body — CR&Iacute;TICO (a p&aacute;gina &eacute; A4 fixo, qualquer estouro &eacute; cortado):

v-body NORMAL (verticais 01 a 04):
EXATAMENTE 2 frases. Total entre 22 e 28 palavras. Cada frase no m&aacute;ximo 14 palavras.
EXEMPLO BOM (28 palavras): "Estrutura de franquia oferece processos prontos e respaldo de marca. Por&eacute;m a opera&ccedil;&atilde;o local limita autonomia para diferencia&ccedil;&atilde;o estrat&eacute;gica frente a concorrentes regionais."
EXEMPLO RUIM (43 palavras — REJEITAR): "A loja funciona como franquia Italinea com showroom pr&oacute;prio em Canoas, equipe de arquitetura e design, e landing page dedicada. A estrutura franqueada oferece respaldo de marca e processos, mas tamb&eacute;m limita autonomia na diferencia&ccedil;&atilde;o local..."

v-body FULL (vertical 05, class="v-card full"):
EXATAMENTE 2 frases. Total entre 28 e 34 palavras. M&aacute;ximo 16 palavras por frase.
NUNCA escreva 3 frases. NUNCA passe de 36 palavras.

CHECAGEM ANTES DE FECHAR A TAG: conte mentalmente as palavras. Se passou, REESCREVA mais curto.`,
  },

  // ════════════════════════ SEO ════════════════════════
  seo: {
    max_tokens: 3000,
    system: `${REGRAS_BASE}

VOCÊ GERA APENAS A PÁGINA DE ANÁLISE DE SEO (cream, condicional).

ESTRUTURA OBRIGATÓRIA:

<div class="pdf-page cream">
<div class="page-header"><span class="h-logo">R.E.C. <em>HUB</em></span><span class="page-number">{NN} · SEO</span></div>
<div class="section-intro">
<span class="kicker">Parte 04 · An&aacute;lise de SEO</span>
<h2 class="section-title">Como o <em>Google</em> enxerga {dom&iacute;nio}</h2>
<p class="section-lead">{contexto sobre o site informado, ≤220}</p>
</div>
<div class="content">
<div class="bench-grid">
{EXATAMENTE 4 bench-cards}
</div>
</div>
<div class="page-footer"><span>Diagn&oacute;stico digital · {nome empresa}</span><span class="pf-handle">@somosrecoficial · somosrecoficial.com.br</span></div>
</div>

4 bench-cards obrigatórios (uma métrica por card):
1. Velocidade mobile (Core Web Vitals típicas vs estimativa do site)
2. Palavras-chave locais ranqueadas (estimativa)
3. Schema markup / dados estruturados (mercado vs lead)
4. Backlinks / autoridade de domínio (estimativa do nicho)

Use a mesma estrutura de bench-card da página de mercado, COM AS MESMAS REGRAS DE TAMANHO:
- bench-label: m&aacute;ximo 8 palavras
- bench-col-sub: m&aacute;ximo 6 palavras
- bench-impact: 1 frase, m&aacute;ximo 18 palavras (ver exemplos na p&aacute;gina de mercado)

CHECAGEM: conte palavras antes de fechar cada </div>.`,
  },

  // ════════════════════════ INVESTIMENTO ════════════════════════
  investimento: {
    max_tokens: 3500,
    system: `${REGRAS_BASE}

VOCÊ GERA APENAS A PÁGINA DE INVESTIMENTO (cream). SEM CLÁUSULA — a cláusula vai em página separada.

ESTRUTURA OBRIGATÓRIA:

<div class="pdf-page cream">
<div class="page-header"><span class="h-logo">R.E.C. <em>HUB</em></span><span class="page-number">{NN} · INVESTIMENTO</span></div>
<div class="section-intro">
<span class="kicker">Parte 04 · Investimento sugerido</span>
<h2 class="section-title">O que <em>solucionamos</em> e quanto custa</h2>
<p class="section-lead">{contexto sobre planos sugeridos, ≤220 char}</p>
</div>
<div class="content">
<div class="plan-grid">
{plan-boxes conforme PLANO INDICADO}
</div>
</div>
<div class="page-footer"><span>Diagn&oacute;stico digital · {nome empresa}</span><span class="pf-handle">@somosrecoficial · somosrecoficial.com.br</span></div>
</div>

TABELA DE REFERÊNCIA (valores corretos de cada plano — isto NÃO é o que você deve gerar, é só consulta):
Plano 1 — R$ 1.500/mês: Social Media + Captação de Conteúdo
Plano 2 — R$ 2.500/mês: Plano 1 + Tráfego Pago Meta
Plano 3 — R$ 2.900/mês: Plano 2 + Google Empresa (+R$300 add-on TikTok)
Plano 4 — R$ 3.800/mês: Plano 3 + Suporte Comercial (+R$300 add-on TikTok)

╔═══════════════════════════════════════════════════════════╗
║  REGRA CRÍTICA — QUAIS PLANOS MOSTRAR                      ║
╚═══════════════════════════════════════════════════════════╝
Gere um plan-box SOMENTE para os planos que aparecem em "PLANO INDICADO" (no fim da mensagem do usuário).
Os planos vêm separados por " | ". Conte-os:
- Se PLANO INDICADO traz 1 plano, gere EXATAMENTE 1 plan-box.
- Se traz 2 planos, gere 2. E assim por diante.
- NUNCA gere planos que não estão em PLANO INDICADO. É PROIBIDO mostrar o catálogo completo.
Exemplo: PLANO INDICADO = "Plano 2 — ..." → gere SOMENTE o plan-box do Plano 2 (com o valor R$ 2.500 da tabela acima).
"Personalizado — {descrição}" conta como 1 plano: use o nome "Personalizado" e o valor/escopo descrito.

Estrutura plan-box (LIMITE: até 6 itens por plano para caber):
<div class="plan-box">
<div>
<span class="plan-box-badge">PLANO N{[ · Recomendado se for o caso]}</span>
<div class="plan-box-name">{nome do plano, ≤80 char}</div>
<div class="plan-box-price">R$ {valor}<small>/m&ecirc;s</small></div>
</div>
<ul class="plan-box-items">
{até 6 itens, cada ≤45 char}
</ul>
</div>

REGRA: NÃO inclua contract-clause. Ela vai em página separada (page=contrato).`,
  },

  // ════════════════════════ CONTRATO (separado quando há planos) ════════════════════════
  contrato: {
    max_tokens: 2000,
    system: `${REGRAS_BASE}

VOCÊ GERA APENAS A PÁGINA DE CONDIÇÕES CONTRATUAIS (cream). Página dedicada à cláusula + observações finais sobre o investimento.

ESTRUTURA OBRIGATÓRIA:

<div class="pdf-page cream">
<div class="page-header"><span class="h-logo">R.E.C. <em>HUB</em></span><span class="page-number">{NN} · CONTRATO</span></div>
<div class="section-intro">
<span class="kicker">Parte 04 · Condi&ccedil;&otilde;es comerciais</span>
<h2 class="section-title">Como funciona a <em>parceria</em></h2>
<p class="section-lead">{1-2 frases sobre o modelo de parceria contínua REC, ≤220}</p>
</div>
<div class="content">
<div class="contract-clause">
<div class="contract-clause-label">&#128203; Fidelidade e prazo</div>
<div class="contract-clause-text">Fidelidade m&iacute;nima de <strong>12 meses</strong> para garantir o ciclo completo de planejamento, execu&ccedil;&atilde;o e otimiza&ccedil;&atilde;o. Contrato de 6 meses dispon&iacute;vel com acr&eacute;scimo de <em>20%</em> sobre o valor mensal do plano escolhido.</div>
</div>
<div class="contract-clause">
<div class="contract-clause-label">&#128184; Verba de m&iacute;dia paga</div>
<div class="contract-clause-text">{se houver plano com tráfego pago: "O investimento em m&iacute;dia (verba Meta Ads, Google Ads) <strong>n&atilde;o est&aacute; incluso</strong> nos valores dos planos. Sugerimos verba m&iacute;nima de <strong>R$ 600/m&ecirc;s</strong> para in&iacute;cio com escala progressiva conforme resultados."; senão: "Os planos selecionados n&atilde;o incluem investimento em m&iacute;dia paga. Caso a estrat&eacute;gia evolua para incluir tr&aacute;fego pago, a verba ser&aacute; tratada separadamente."}</div>
</div>
<div class="contract-clause">
<div class="contract-clause-label">&#128221; Pr&oacute;ximos passos</div>
<div class="contract-clause-text">Ap&oacute;s alinhamento do plano escolhido, iniciamos com reuni&atilde;o de <strong>kickoff em at&eacute; 7 dias</strong> para imers&atilde;o na marca, defini&ccedil;&atilde;o de calend&aacute;rio editorial e agendamento da primeira capta&ccedil;&atilde;o presencial.</div>
</div>
</div>
<div class="page-footer"><span>Diagn&oacute;stico digital · {nome empresa}</span><span class="pf-handle">@somosrecoficial · somosrecoficial.com.br</span></div>
</div>

REGRA: gere EXATAMENTE 3 cards de contract-clause, na ordem acima.`,
  },

  // ════════════════════════ MODULOS ════════════════════════
  modulos: {
    max_tokens: 3000,
    system: `${REGRAS_BASE}

VOCÊ GERA APENAS A PÁGINA DE MÓDULOS DE TRABALHO (cream, "como entregamos").

ESTRUTURA OBRIGATÓRIA:

<div class="pdf-page cream">
<div class="page-header"><span class="h-logo">R.E.C. <em>HUB</em></span><span class="page-number">{NN} · M&Oacute;DULOS</span></div>
<div class="section-intro">
<span class="kicker">Parte 05 · M&oacute;dulos de trabalho</span>
<h2 class="section-title">Como <em>entregamos</em> resultado</h2>
<p class="section-lead">{contexto sobre processo de trabalho REC, ≤220}</p>
</div>
<div class="content">
<div class="deliverable-grid">
{EXATAMENTE 4 d-cards}
</div>
</div>
<div class="page-footer"><span>Diagn&oacute;stico digital · {nome empresa}</span><span class="pf-handle">@somosrecoficial · somosrecoficial.com.br</span></div>
</div>

4 MÓDULOS OBRIGATÓRIOS (use estes nomes e foque em COMO trabalhamos, não O QUE):
1. Gest&atilde;o de Instagram (ícone ◐)
2. Capta&ccedil;&atilde;o de Conte&uacute;do (ícone ◑)
3. Tr&aacute;fego Pago Meta Ads (ícone ◒)
4. Google Empresa GMB (ícone ◓)

Estrutura d-card (LIMITES APERTADOS para caber 4 em 2x2):
<div class="d-card">
<div class="d-head">
<div class="d-icon">{ícone}</div>
<div class="d-head-text">
<div class="d-title">{nome módulo, ≤45 char}</div>
<span class="d-plan-tag">{Plano N+}</span>
</div>
</div>
<p class="d-body">{COMO trabalhamos, ≤140 char}</p>
<div class="d-items">
{EXATAMENTE 4 d-items, cada ≤55 char, com div.d-item começando com span.d-bullet ▸}
</div>
</div>

REGRA ANTI-DUPLICAÇÃO: d-cards mostram COMO TRABALHAMOS (calendário, formatos, revisões, fluxo). NUNCA repita os itens dos plan-boxes.
PROIBIDO no Google Empresa: mencionar publicações periódicas. REC só otimiza perfil, atualiza fotos e gerencia avaliações.`,
  },

  // ════════════════════════ HUB-WHY ════════════════════════
  'hub-why': {
    max_tokens: 2500,
    system: `${REGRAS_BASE}

VOCÊ GERA APENAS A PÁGINA FINAL HUB-WHY (dark, fechamento institucional).

ESTRUTURA OBRIGATÓRIA:

<div class="pdf-page dark">
<div class="cover-decoration"></div>
<div class="hw-content">
<div class="hw-eyebrow">Por que com o R.E.C.</div>
<h2 class="hw-title">{título institucional com <em>destaque</em>, ≤80}</h2>
<p class="hw-sub">{1-2 frases tom da marca REC, ≤240}</p>
<div class="hw-benefits">
{EXATAMENTE 5 hw-benefits}
</div>
<div class="hw-tagline">"{tagline italic curta, ≤60}"</div>
<div class="hw-footer">
<div class="hw-footer-logo"><img src="" alt="R.E.C."><span class="hw-brand">R.E.C. <em>HUB</em></span></div>
<div class="hw-footer-handle">somosrecoficial.com.br<br>@somosrecoficial</div>
</div>
</div>
</div>

Estrutura hw-benefit:
<div class="hw-benefit">
<div class="hw-b-num">{NN}</div>
<div>
<div class="hw-b-title">{título, ≤50}</div>
<p class="hw-b-desc">{descrição, ≤130}</p>
</div>
</div>

5 BENEFÍCIOS típicos do REC HUB (personalize um pouco mas mantenha esta linha):
01 Estratégia personalizada por nicho
02 Time dedicado, não freelancer rotativo
03 Captação mensal in-loco (não banco de imagens)
04 Relatórios mensais com métricas reais
05 Foco em ROI, não vanity metrics

A img src="" será preenchida pelo sistema.`,
  },
};

// ═══════════════════════════════════════════════════════════════
// MONTA O USER MESSAGE COM DADOS DO LEAD
// ═══════════════════════════════════════════════════════════════
function buildUserMessage(page, lead, pageNumber, totalPages, research) {
  const mes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const now = new Date();
  const mesAno = mes[now.getMonth()] + ' ' + now.getFullYear();
  const pageNumStr = String(pageNumber).padStart(2, '0');

  const linhas = [
    `Gere a página "${page}" (${pageNumStr} de ${totalPages}) do diagnóstico com os dados abaixo:`,
    '',
    `NÚMERO DESTA PÁGINA (use exatamente este número no .page-number do header): ${pageNumStr}`,
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
  linhas.push('');
  linhas.push(`EMPRESA: ${lead.nome_empresa || 'Não informada'}`);
  linhas.push(`INSTAGRAM: ${lead.instagram || ''}`);
  linhas.push(`SEGMENTO: ${lead.segmento || 'Não informado'}`);
  linhas.push(`CIDADE: ${lead.cidade || 'Não informada'}`);
  linhas.push(`MÊS/ANO: ${mesAno}`);
  linhas.push('');
  linhas.push(`CANAIS A ANALISAR: ${lead.canais || 'Nenhum especificado'}`);

  if (lead.site) linhas.push(`SITE: ${lead.site}`);
  if (lead.tiktok_handle) linhas.push(`TIKTOK: ${lead.tiktok_handle}`);
  if (lead.youtube_handle) linhas.push(`YOUTUBE: ${lead.youtube_handle}`);
  if (lead.linkedin_handle) linhas.push(`LINKEDIN: ${lead.linkedin_handle}`);

  linhas.push('');
  linhas.push(`CONTEXTO:`);
  if (lead.trafego_atual) linhas.push(`- Tráfego pago atual: ${lead.trafego_atual}`);
  if (lead.tem_site) linhas.push(`- Tem site: ${lead.tem_site}`);
  if (lead.objetivo) linhas.push(`- Objetivos: ${lead.objetivo}`);

  if (lead.observacoes) {
    linhas.push('');
    linhas.push(`OBSERVAÇÕES DO CAPTADOR: ${lead.observacoes}`);
  }

  if (page === 'investimento' && lead.plano) {
    linhas.push('');
    linhas.push(`PLANO INDICADO: ${lead.plano}`);
  }

  if (lead.obs_extra) {
    linhas.push('');
    linhas.push(`NOTAS EXTRAS: ${lead.obs_extra}`);
  }

  return linhas.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// VALIDAÇÃO ESTRUTURAL — checa se Haiku gerou HTML válido para a página
// ═══════════════════════════════════════════════════════════════
// Cada página tem classes esperadas. Se ausentes, é página em branco / corrompida.
const REQUIRED_CLASSES = {
  'cover': ['cover-rec-logo', 'cover-title', 'cover-kpis'],
  'problems-1': ['problems-grid', 'p-card'],
  'problems-2': ['problems-grid', 'p-card'],
  'mercado': ['bench-grid', 'bench-card'],
  'mercado-cont': ['bench-grid', 'bench-card', 'opp-strip'],
  'verticais': ['vertical-grid', 'v-card'],
  'seo': ['bench-grid', 'bench-card'],
  'investimento': ['plan-grid', 'plan-box'],
  'contrato': ['contract-clause'],
  'modulos': ['deliverable-grid', 'd-card'],
  'hub-why': ['hw-content', 'hw-benefits', 'hw-benefit'],
};

// Validações específicas por página (além das classes obrigatórias)
function validaEstrutura(page, html) {
  const erros = [];
  const required = REQUIRED_CLASSES[page] || [];
  for (const cls of required) {
    if (!html.includes('class="' + cls) && !html.includes('class="' + cls + ' ') && !html.includes(' ' + cls + '"') && !html.includes(' ' + cls + ' ')) {
      erros.push('classe obrigatória ausente: ' + cls);
    }
  }
  // HTML mínimo razoável: header (~80b) + intro (~200b) + conteúdo. <600 bytes é página fantasma.
  if (html.length < 600) {
    erros.push('HTML muito curto (' + html.length + ' bytes) — provável página em branco');
  }
  // Verticais: deve ter EXATAMENTE 1 v-card.full
  if (page === 'verticais') {
    const matchesFull = (html.match(/class="v-card full"|class="v-card\s+full"/g) || []).length;
    const matchesNormal = (html.match(/class="v-card"(?!\s*full)/g) || []).length;
    if (matchesFull !== 1) erros.push('verticais: encontrou ' + matchesFull + ' v-card.full (esperado 1)');
    if (matchesNormal !== 4) erros.push('verticais: encontrou ' + matchesNormal + ' v-card normal (esperado 4)');
  }
  return erros;
}

// Chama a API Anthropic e devolve {html, stop_reason, usage}. Pode lançar.
async function callAnthropic(apiKey, pageConfig, userMessage, hint) {
  const systemFinal = hint ? pageConfig.system + '\n\nIMPORTANTE — TENTATIVA ANTERIOR FALHOU: ' + hint : pageConfig.system;
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      // max_tokens precisa cobrir o thinking + a saída HTML real
      max_tokens: pageConfig.max_tokens + THINKING_BUDGET,
      thinking: { type: 'enabled', budget_tokens: THINKING_BUDGET },
      system: systemFinal,
      messages: [{ role: 'user', content: userMessage }],
      stream: false,
    }),
  });
  if (!upstream.ok) {
    const err = await upstream.text();
    const error = new Error(err);
    error.status = upstream.status;
    throw error;
  }
  return upstream.json();
}

// Correção determinística de erros recorrentes do modelo (ortografia + inglês solto).
// Roda sempre — garante consistência sem depender do prompt nem gastar API extra.
const CORRECOES = [
  [/Capturação/g, 'Captação'], [/capturação/g, 'captação'],
  [/\bcapção\b/gi, 'captação'],
  [/rastrecáve(l|is)/gi, 'rastreáve$1'],
  [/contéudo/g, 'conteúdo'], [/Contéudo/g, 'Conteúdo'],
  [/desnecessáriamente/gi, 'desnecessariamente'],
  [/Fragmented/g, 'Fragmentada'], [/FRAGMENTED/g, 'FRAGMENTADA'],
];
function corrigirTexto(html) {
  let out = html;
  for (const [re, rep] of CORRECOES) out = out.replace(re, rep);
  return out;
}

// Página estática de fontes/metodologia (sem chamada de API — custo zero, 100% consistente).
function paginaFontes() {
  const grupo = (titulo, itens) => `
      <div style="margin-bottom:22px;">
        <div style="font-family:var(--font-num),'Space Grotesk',sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--teal,#00a198);font-weight:600;margin-bottom:8px;">${titulo}</div>
        <div style="font-family:var(--font-body),'Manrope',sans-serif;font-size:14px;line-height:1.6;color:var(--blue,#012659);">${itens.join(' &middot; ')}</div>
      </div>`;
  return `<div class="pdf-page cream">
      <div class="page-header"><span class="h-logo">R.E.C. <em>HUB</em></span><span class="page-number">ANEXO &middot; FONTES</span></div>
      <div class="section-intro">
        <span class="kicker">Anexo &middot; Fontes e metodologia</span>
        <h2 class="section-title">Fontes e <em>metodologia</em></h2>
        <p class="section-lead">Este diagn&oacute;stico foi constru&iacute;do a partir de dados p&uacute;blicos dispon&iacute;veis na data da an&aacute;lise, com apoio das ferramentas e fontes de refer&ecirc;ncia abaixo.</p>
      </div>
      <div class="content" style="padding-top:8px;">
        ${grupo('Presen&ccedil;a digital e redes', ['mLabs', 'An&aacute;lise de perfis p&uacute;blicos do Instagram', 'Google Maps / Google Neg&oacute;cios'])}
        ${grupo('Site e SEO', ['Google Search Central', 'PageSpeed Insights', 'Semrush', 'Ahrefs', 'Ubersuggest'])}
        ${grupo('Mercado e setor', ['Dados p&uacute;blicos do setor', 'ABComm', 'Cronoshare'])}
        <p style="font-family:var(--font-body),'Manrope',sans-serif;font-size:12px;line-height:1.6;color:var(--muted,#64748b);max-width:620px;margin:22px 0 0;border-top:1px solid rgba(0,0,0,.08);padding-top:16px;">Os n&uacute;meros de mercado refletem refer&ecirc;ncias p&uacute;blicas e podem variar conforme a fonte e o per&iacute;odo. As recomenda&ccedil;&otilde;es s&atilde;o an&aacute;lise do time REC HUB de Neg&oacute;cios.</p>
      </div>
      <div class="page-footer"><span>Diagn&oacute;stico digital</span><span class="pf-handle">@somosrecoficial &middot; somosrecoficial.com.br</span></div>
    </div>`;
}

function extractHtml(data, pageNumber) {
  let html = '';
  if (Array.isArray(data.content)) {
    for (const block of data.content) {
      if (block.type === 'text' && block.text) html += block.text;
    }
  }
  html = html.trim();
  if (html.startsWith('```')) {
    html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  }
  const firstDiv = html.indexOf('<div class="pdf-page');
  if (firstDiv > 0) html = html.slice(firstDiv);
  const pageNumStr = String(pageNumber || 1).padStart(2, '0');
  html = html.replace(/\{NN\}/g, pageNumStr);
  return corrigirTexto(html);
}

// ═══════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  if (applyCors(req, res, 'POST,OPTIONS')) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  const rl = rateLimit(req, 'diagnostico-page', 60, 60000);
  if (rl.blocked) { res.setHeader('Retry-After', rl.retryAfter); return res.status(429).json({ error: 'Rate limit' }); }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const body = readBody(req);
  const { page, lead, pageNumber, totalPages, research } = body;

  // Página estática: não consome API
  if (page === 'fontes') {
    return res.status(200).json({
      page, html: paginaFontes(), stop_reason: 'end_turn',
      attempts: 0, tokens: { input: 0, output: 0 },
    });
  }

  if (!page || !PAGES[page]) {
    return res.status(400).json({ error: `Page "${page}" inválida. Válidas: ${Object.keys(PAGES).join(', ')}` });
  }
  if (!lead || typeof lead !== 'object') {
    return res.status(400).json({ error: 'lead object required' });
  }

  const pageConfig = PAGES[page];
  const userMessage = buildUserMessage(page, lead, pageNumber || 1, totalPages || 1, research);

  try {
    // 1ª tentativa
    let data = await callAnthropic(apiKey, pageConfig, userMessage, null);
    let html = extractHtml(data, pageNumber);
    let tokensTotal = { input: data.usage?.input_tokens || 0, output: data.usage?.output_tokens || 0 };

    if (!html || !html.startsWith('<div class="pdf-page')) {
      return res.status(500).json({
        error: 'Resposta da IA não começa com <div class="pdf-page">',
        preview: html.slice(0, 200), page,
      });
    }

    // Validação estrutural — checa classes obrigatórias, tamanho mínimo e v-card.full count
    let erros = validaEstrutura(page, html);
    let attempt = 1;

    if (erros.length) {
      console.warn(`[diagnostico-page] "${page}" tent.${attempt} falhou: ${erros.join('; ')} — retentando`);
      const hint = 'A resposta anterior teve estes problemas: ' + erros.join('; ') +
        '. Refaça a página seguindo EXATAMENTE a estrutura HTML do prompt. ' +
        'NÃO omita classes obrigatórias. NÃO retorne HTML vazio ou só com header.';
      data = await callAnthropic(apiKey, pageConfig, userMessage, hint);
      html = extractHtml(data, pageNumber);
      tokensTotal.input += data.usage?.input_tokens || 0;
      tokensTotal.output += data.usage?.output_tokens || 0;
      attempt = 2;
      erros = validaEstrutura(page, html);
      if (erros.length) {
        console.error(`[diagnostico-page] "${page}" tent.2 TAMBÉM falhou: ${erros.join('; ')}`);
        // Retorna mesmo assim com warning — melhor que quebrar o PDF inteiro
      }
    }

    return res.status(200).json({
      page,
      html,
      stop_reason: data.stop_reason,
      attempts: attempt,
      validation_warnings: erros.length ? erros : undefined,
      tokens: tokensTotal,
    });
  } catch (error) {
    console.error(`[diagnostico-page] erro em "${page}":`, error.message);
    return res.status(error.status || 500).json({ error: error.message, page });
  }
}
