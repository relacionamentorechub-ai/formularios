export const config = { maxDuration: 60 };

const SYSTEM_PROMPT = `Você é o gerador de diagnósticos digitais do R.E.C. HUB de Negócios.
Gere um arquivo HTML completo e auto-contido — diagnóstico profissional em formato A4 imprimível.
Retorne APENAS o HTML puro, sem markdown, sem blocos de código, sem explicações. Comece com <!DOCTYPE html>.

REGRAS DE ESCRITA:
- Sem traços como pontuação (—, –). Use vírgula ou reescreva.
- Sem title case em frases corridas. Apenas primeira letra maiúscula e nomes próprios.
- Sem frases genéricas. Use dados concretos e situacionais.
- HTML entities para acentos: ã=&atilde; ç=&ccedil; ê=&ecirc; ó=&oacute; á=&aacute; é=&eacute; í=&iacute; ú=&uacute; â=&acirc; etc.
- Tom direto, baseado no que foi informado no formulário.

SISTEMA DE PÁGINAS A4 — OBRIGATÓRIO:
Todo conteúdo deve estar dentro de div.pdf-page. Cada div = uma página A4 exata.
NUNCA usar fluxo livre com @page + break-inside. Sempre div.pdf-page explícitos.

CSS OBRIGATÓRIO (copie exatamente no <style>):
:root{--cyan:#06B6D4;--cyan-light:#CFFAFE;--cyan-dark:#0E7490;--red:#EF4444;--red-light:#FEE2E2;--orange:#F97316;--orange-light:#FFEDD5;--green:#10B981;--green-light:#D1FAE5;--green-dark:#065F46;--gray-50:#F9FAFB;--gray-100:#F3F4F6;--gray-200:#E5E7EB;--gray-400:#9CA3AF;--gray-500:#6B7280;--gray-600:#4B5563;--gray-700:#374151;--gray-800:#1F2937;--gray-900:#111827;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#D1D5DB;color:var(--gray-900);line-height:1.6;-webkit-font-smoothing:antialiased;}
.pdf-page{width:794px;min-height:1123px;margin:20px auto;background:#fff;box-shadow:0 2px 16px rgba(0,0,0,0.18);overflow:hidden;position:relative;display:flex;flex-direction:column;}
.pdf-page.dark{background:var(--gray-900);}
.pdf-page.gray{background:var(--gray-50);border-top:1px solid var(--gray-200);border-bottom:1px solid var(--gray-200);}
.pdf-page .inner{padding:36px 40px;flex:1;display:flex;flex-direction:column;}
@page{size:210mm 297mm;margin:0;}
@media print{body{background:white;}.pdf-page{width:210mm;height:297mm;min-height:unset;margin:0;box-shadow:none;break-after:page;page-break-after:always;}.pdf-page:last-child{break-after:auto;page-break-after:auto;}}
.topbar{height:5px;background:linear-gradient(90deg,var(--cyan-dark),var(--cyan),#67E8F9);}
header{background:#fff;border-bottom:1px solid var(--gray-200);padding:16px 32px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.logo{font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--cyan-dark);}
.date-badge{font-size:12px;color:var(--gray-400);background:var(--gray-100);padding:4px 12px;border-radius:20px;}
.hero{flex:1;background:linear-gradient(135deg,var(--gray-900) 0%,#1e3a4a 100%);padding:48px 32px 40px;text-align:center;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.alert-badge{display:inline-block;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);color:#FCA5A5;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:5px 16px;border-radius:20px;margin-bottom:18px;}
.hero h1{font-size:clamp(20px,3.5vw,32px);font-weight:800;line-height:1.2;margin-bottom:10px;}
.hero h1 span{color:var(--cyan);}
.hero-sub{font-size:13.5px;color:#94A3B8;margin-bottom:12px;max-width:540px;}
.hero-meta{font-size:12px;color:#64748B;margin-bottom:28px;}
.hero-meta strong{color:#CBD5E1;}
.channels{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:28px;}
.ch-tag{font-size:11px;font-weight:700;padding:5px 14px;border-radius:20px;letter-spacing:.06em;text-transform:uppercase;}
.ch-instagram{background:rgba(131,58,180,.2);color:#D8B4FE;border:1px solid rgba(131,58,180,.3);}
.ch-facebook{background:rgba(59,130,246,.2);color:#93C5FD;border:1px solid rgba(59,130,246,.3);}
.ch-google{background:rgba(234,179,8,.2);color:#FDE047;border:1px solid rgba(234,179,8,.3);}
.ch-meta{background:rgba(239,68,68,.2);color:#FCA5A5;border:1px solid rgba(239,68,68,.3);}
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:680px;width:100%;}
.kpi-card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:18px 14px;text-align:center;}
.kpi-value{font-size:clamp(18px,3vw,26px);font-weight:800;color:var(--cyan);display:block;margin-bottom:4px;}
.kpi-label{font-size:10px;color:#CBD5E1;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;display:block;}
.kpi-verdict{font-size:10px;font-weight:700;background:rgba(239,68,68,.2);color:#FCA5A5;padding:3px 8px;border-radius:10px;display:inline-block;}
.kpi-verdict.ok{background:rgba(16,185,129,.2);color:#6EE7B7;}
.section-header{display:flex;align-items:center;gap:14px;}
.section-icon{width:40px;height:40px;background:var(--cyan-light);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.section-icon.orange{background:var(--orange-light);}
.section-icon.green{background:var(--green-light);}
.section-label{font-size:11px;font-weight:700;color:var(--cyan-dark);text-transform:uppercase;letter-spacing:.12em;margin-bottom:3px;}
.section-label.orange{color:#C2410C;}
.section-label.green{color:var(--green-dark);}
.section-title{font-size:clamp(16px,2.5vw,22px);font-weight:800;color:var(--gray-900);}
.page-cont{font-size:11px;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.12em;margin-bottom:20px;}
.problems{display:grid;grid-template-columns:1fr 1fr;gap:16px;flex:1;align-content:start;}
.card{background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:20px;}
.card.instagram{border-left:4px solid #A855F7;}.card.facebook{border-left:4px solid #3B82F6;}.card.google{border-left:4px solid #EAB308;}.card.meta{border-left:4px solid var(--red);}.card.tiktok{border-left:4px solid #000;}.card.site{border-left:4px solid var(--green);}
.card-channel{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px;display:inline-block;padding:2px 8px;border-radius:8px;}
.card-channel.instagram{background:rgba(168,85,247,.1);color:#9333EA;}.card-channel.facebook{background:rgba(59,130,246,.1);color:#2563EB;}.card-channel.google{background:rgba(234,179,8,.1);color:#B45309;}.card-channel.meta{background:rgba(239,68,68,.1);color:#DC2626;}.card-channel.tiktok{background:rgba(0,0,0,.07);color:#111;}.card-channel.site{background:rgba(16,185,129,.1);color:#065F46;}
.card-num{font-size:11px;font-weight:800;color:var(--cyan);letter-spacing:.1em;margin-bottom:6px;display:block;}
.card-title{font-size:14px;font-weight:700;color:var(--gray-900);margin-bottom:8px;line-height:1.3;}
.card-body{font-size:13px;color:var(--gray-600);margin-bottom:12px;line-height:1.55;}
.card-tags{display:flex;flex-wrap:wrap;gap:5px;}
.tag{font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;display:inline-block;}
.tag.dado{background:var(--orange-light);color:#C2410C;}.tag.impacto{background:var(--red-light);color:#B91C1C;}
.bench-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.bench-card{background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:20px;}
.bench-label{font-size:13px;font-weight:700;color:var(--gray-900);margin-bottom:14px;}
.bench-compare{display:flex;align-items:stretch;gap:8px;margin-bottom:12px;}
.bench-col{flex:1;border-radius:8px;padding:10px;}
.bench-col.market{background:#F0FDF4;}.bench-col.you{background:var(--red-light);}
.bench-value{font-size:15px;font-weight:800;line-height:1.2;margin-bottom:4px;}
.bench-col.market .bench-value{color:var(--green-dark);}.bench-col.you .bench-value{color:var(--red);}
.bench-sub{font-size:10px;line-height:1.3;}
.bench-col.market .bench-sub{color:#166534;}.bench-col.you .bench-sub{color:#991B1B;}
.bench-vs{font-size:11px;font-weight:800;color:var(--gray-400);flex-shrink:0;align-self:center;}
.bench-impact{font-size:12px;color:var(--gray-600);line-height:1.5;padding-top:12px;border-top:1px solid var(--gray-100);}
.opportunity-strip{background:linear-gradient(135deg,#FFF7ED,#FFEDD5);border:1px solid #FED7AA;border-radius:12px;padding:20px 24px;}
.opportunity-strip h3{font-size:14px;font-weight:800;color:#9A3412;margin-bottom:8px;}
.opportunity-strip p{font-size:13px;color:#7C2D12;line-height:1.6;}
.deliverable-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;flex:1;align-content:start;}
.del-card{background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:20px;border-top:3px solid var(--cyan);}
.del-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;}
.del-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.del-icon.ig{background:rgba(168,85,247,.1);}.del-icon.ads{background:var(--red-light);}.del-icon.goog{background:var(--green-light);}.del-icon.tik{background:rgba(0,0,0,.07);}.del-icon.web{background:var(--cyan-light);}.del-icon.gen{background:var(--gray-100);}
.del-title{font-size:14px;font-weight:700;color:var(--gray-900);margin-bottom:4px;}
.del-plan-tag{font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;letter-spacing:.05em;text-transform:uppercase;background:var(--cyan-light);color:var(--cyan-dark);}
.del-body{font-size:12.5px;color:var(--gray-600);margin-bottom:12px;line-height:1.55;}
.del-items{display:flex;flex-direction:column;gap:5px;}
.del-item{display:flex;align-items:flex-start;gap:7px;font-size:12px;color:var(--gray-700);}
.del-bullet{color:var(--cyan);font-weight:700;font-size:13px;flex-shrink:0;margin-top:1px;}
.plan-box{display:flex;align-items:flex-start;gap:24px;background:linear-gradient(135deg,var(--gray-900) 0%,#1a3040 100%);border:1.5px solid var(--cyan);border-radius:14px;padding:20px 24px;margin-bottom:18px;}
.plan-box-left{flex-shrink:0;min-width:170px;}
.plan-box-badge{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;background:rgba(6,182,212,.15);color:var(--cyan);border:1px solid rgba(6,182,212,.3);border-radius:20px;padding:3px 10px;display:inline-block;margin-bottom:12px;}
.plan-box-name{font-size:13px;font-weight:700;color:#fff;margin-bottom:10px;line-height:1.4;}
.plan-box-price{font-size:28px;font-weight:900;color:var(--cyan);line-height:1;}
.plan-box-price span{font-size:13px;font-weight:500;color:var(--gray-400);}
.plan-box-items{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;align-content:start;flex:1;}
.plan-box-items li{font-size:12px;color:#CBD5E1;display:flex;align-items:flex-start;gap:6px;line-height:1.4;}
.plan-box-items li::before{content:"✔";color:var(--cyan);font-size:10px;flex-shrink:0;margin-top:2px;}
.hub-why-tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--cyan);background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.3);border-radius:99px;padding:4px 16px;margin-bottom:14px;}
.hub-why-title{font-size:22px;font-weight:800;color:#fff;margin-bottom:10px;line-height:1.25;}
.hub-why-sub{font-size:14px;color:var(--gray-400);line-height:1.7;margin-bottom:28px;}
.hub-benefits{display:flex;flex-direction:column;gap:0;margin-bottom:28px;}
.hub-benefit{display:flex;gap:18px;align-items:flex-start;padding:16px 0;border-bottom:1px solid rgba(255,255,255,.06);}
.hub-benefit:first-child{padding-top:0;}.hub-benefit:last-child{border-bottom:none;}
.hub-b-num{font-size:11px;font-weight:800;color:var(--cyan);letter-spacing:.05em;padding-top:2px;flex-shrink:0;width:22px;}
.hub-b-title{font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;}
.hub-b-desc{font-size:13px;color:var(--gray-400);line-height:1.6;}
.hub-why-bottom{display:flex;align-items:center;justify-content:space-between;padding-top:20px;border-top:1px solid rgba(255,255,255,.08);flex-wrap:wrap;gap:8px;}
.hub-why-tagline{font-size:14px;font-weight:600;font-style:italic;color:var(--cyan);}
.hub-why-handle{font-size:12px;color:var(--gray-600);letter-spacing:.05em;}

PLANO DE PÁGINAS — ATÉ 10 PÁGINAS:
Página 1: dark — topbar + header + hero com KPIs (3 KPIs baseados nos dados informados)
Página 2: white — "Parte 1 · Pontos identificados" + 4 problem cards (grid 2x2)
Página 3: white — continuação dos pontos (mais 4 cards se 8+ pontos) OU benchmark se 6 pontos
Página 4: gray — "Parte 2 · Análise de mercado" + 4 bench-cards (grid 2x2) + opportunity-strip
Página 5: white — "Parte 3 · O que solucionamos" + plan-box(es) (se com_proposta=Sim) + del-cards
Páginas extras: se houver muitos planos ou entregáveis, use páginas adicionais (máximo 10 no total)
Última página: dark — hub-why + footer

REGRA PARA QUANTIDADE DE PROBLEMAS:
- Gere 8 pontos se houver 3+ canais a analisar (4 por página = 2 páginas de problemas)
- Gere 6 pontos se houver 1-2 canais (todos na página 2)
- Todos os pontos devem ser baseados nos dados informados

REGRA PARA MÚLTIPLOS PLANOS (se com_proposta = "Sim"):
- 1 plano: 1 plan-box normal
- 2 planos: 2 plan-box lado a lado (display:flex; gap:16px; margin-bottom:18px)
- 3 planos: 3 plan-box empilhados, padding reduzido (padding:16px 20px)
- Os planos chegam separados por " | " no campo PLANO INDICADO

CANAIS — TAGS HTML para uso na section de channels da página 1:
- Instagram: <span class="ch-tag ch-instagram">Instagram</span>
- Facebook: <span class="ch-tag ch-facebook">Facebook</span>
- Google Empresa: <span class="ch-tag ch-google">Google Empresa</span>
- Meta Ads: <span class="ch-tag ch-meta">Meta Ads</span>
- TikTok: <span class="ch-tag" style="background:rgba(0,0,0,.35);color:#fff;border:1px solid rgba(255,255,255,.2);">TikTok</span>
- Site/SEO: <span class="ch-tag" style="background:rgba(16,185,129,.2);color:#6EE7B7;border:1px solid rgba(16,185,129,.3);">Site / SEO</span>

PLANOS (usar apenas se com_proposta = "Sim"):
Plano 1 — R$ 1.500/mês: Social Media + Captação de Conteúdo. Itens: planejamento estratégico mensal, conteúdo para redes sociais (3 posts/semana), captação de fotos e vídeos, edição de materiais, organização do perfil, acompanhamento contínuo.
Plano 2 — R$ 2.500/mês: Social Media + Captação + Tráfego Pago Meta. Tudo do Plano 1 mais: Meta Ads até 3 campanhas/mês, estratégia e segmentação, otimização e escala.
Plano 3 — R$ 2.900/mês: Social Media + Captação + Tráfego Meta + Google Empresa. Tudo do Plano 2 mais: gestão Google Empresa (GMB), otimização de perfil, posicionamento local. Add-on TikTok +R$300.
Plano 4 — R$ 3.800/mês: Plano Completo + Suporte Comercial. Tudo do Plano 3 mais: estratégia comercial, follow-up, marketing de relacionamento. Add-on TikTok +R$300.

Regra de escolha: use o plano que melhor cobre os canais solicitados. Se houver plano informado no formulário, use esse.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { messages, max_tokens, system } = req.body;

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: max_tokens || 8000,
      system: system || SYSTEM_PROMPT,
      messages: messages,
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
