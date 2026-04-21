// Serverless function: API do Mercadinho
// Storage: Vercel KV (Upstash Redis) via REST API — sem dependências npm.
//
// Variáveis de ambiente necessárias no Vercel:
//   KV_REST_API_URL        (auto-criada ao ativar Vercel KV)
//   KV_REST_API_TOKEN      (auto-criada ao ativar Vercel KV)
//   ADMIN_PASSWORD         (você define)

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'troque-esta-senha';
const KEY = 'mercadinho:produtos:v1';

// ----- Imagens dos 5 produtos iniciais (SVG inline como data URI) -----
const IMG_AGUA = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop stop-color='%23d7e9ee'/><stop offset='1' stop-color='%236ea8b8'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/><path d='M50 22 Q35 48 35 62 A15 15 0 0 0 65 62 Q65 48 50 22 Z' fill='%23ffffff' opacity='.92'/><path d='M44 58 Q44 48 50 44' stroke='%23ffffff' stroke-width='2.2' fill='none' opacity='.65' stroke-linecap='round'/></svg>";

const IMG_REFRI = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop stop-color='%23d44b4b'/><stop offset='1' stop-color='%23922020'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/><rect x='38' y='18' width='24' height='64' rx='3' fill='%23f4e9cc'/><rect x='38' y='18' width='24' height='8' fill='%23c9a961'/><rect x='38' y='42' width='24' height='2.5' fill='%23922020'/><rect x='38' y='47' width='24' height='2.5' fill='%23922020'/><rect x='40' y='52' width='20' height='20' fill='%23922020' opacity='.35'/></svg>";

const IMG_CERVEJA = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop stop-color='%23e6c57a'/><stop offset='1' stop-color='%23a07a34'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/><path d='M44 15 L44 30 Q38 35 38 45 L38 85 Q38 90 42 90 L58 90 Q62 90 62 85 L62 45 Q62 35 56 30 L56 15 Z' fill='%231f3a2e'/><rect x='42' y='48' width='16' height='22' fill='%23e6c57a' opacity='.85'/><rect x='42' y='48' width='16' height='6' fill='%23f6efdd' opacity='.6'/></svg>";

const IMG_CHOCOLATE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop stop-color='%23a06d44'/><stop offset='1' stop-color='%23543018'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/><rect x='22' y='30' width='56' height='40' rx='3' fill='%23d4b87a'/><rect x='28' y='36' width='44' height='28' fill='%236a3a1f'/><line x1='39.67' y1='36' x2='39.67' y2='64' stroke='%23000' stroke-opacity='.35' stroke-width='.8'/><line x1='50' y1='36' x2='50' y2='64' stroke='%23000' stroke-opacity='.35' stroke-width='.8'/><line x1='60.33' y1='36' x2='60.33' y2='64' stroke='%23000' stroke-opacity='.35' stroke-width='.8'/><line x1='28' y1='50' x2='72' y2='50' stroke='%23000' stroke-opacity='.35' stroke-width='.8'/></svg>";

const IMG_CHIPS = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop stop-color='%23f3cc5c'/><stop offset='1' stop-color='%23c97a20'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/><path d='M30 18 L70 18 L68 88 Q50 94 32 88 Z' fill='%23c4392a'/><path d='M30 18 L70 18 L68 24 Q50 28 32 24 Z' fill='%23a12a1f'/><text x='50' y='54' text-anchor='middle' font-family='Arial' font-weight='900' font-size='12' fill='%23f6efdd' letter-spacing='1'>CHIPS</text><ellipse cx='50' cy='72' rx='14' ry='5' fill='%23f3cc5c' opacity='.7'/></svg>";

const SEED = [
  { id: 's1', nome: 'Água Mineral 500ml',      categoria: 'Bebidas',    quantidade: 24, precoVenda: 3.50,  precoCusto: 1.30, imagem: IMG_AGUA },
  { id: 's2', nome: 'Refrigerante Lata 350ml', categoria: 'Bebidas',    quantidade: 18, precoVenda: 6.00,  precoCusto: 3.20, imagem: IMG_REFRI },
  { id: 's3', nome: 'Cerveja Long Neck 330ml', categoria: 'Alcoólicos', quantidade: 12, precoVenda: 9.00,  precoCusto: 4.80, imagem: IMG_CERVEJA },
  { id: 's4', nome: 'Chocolate ao Leite 90g',  categoria: 'Doces',      quantidade: 10, precoVenda: 8.50,  precoCusto: 4.20, imagem: IMG_CHOCOLATE },
  { id: 's5', nome: 'Batata Chips 90g',        categoria: 'Salgados',   quantidade: 8,  precoVenda: 10.00, precoCusto: 5.40, imagem: IMG_CHIPS }
];

// ----- Upstash Redis REST helpers -----
async function kvGet(key) {
  try {
    const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (data.result === null || data.result === undefined) return null;
    return JSON.parse(data.result);
  } catch (_) {
    return null;
  }
}

async function kvSet(key, value) {
  const r = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(value)
  });
  return r.ok;
}

function sanitizeProduto(p) {
  return {
    id: String(p.id || '').slice(0, 40) || ('p' + Date.now().toString(36)),
    nome: String(p.nome || '').slice(0, 120).trim(),
    categoria: String(p.categoria || 'Outros').slice(0, 40),
    quantidade: Math.max(0, Math.min(9999, parseInt(p.quantidade, 10) || 0)),
    precoVenda: Math.max(0, Math.min(999999, Number(p.precoVenda) || 0)),
    precoCusto: Math.max(0, Math.min(999999, Number(p.precoCusto) || 0)),
    imagem: typeof p.imagem === 'string' && p.imagem.length < 400000 ? p.imagem : null
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const kvConfigured = Boolean(KV_URL && KV_TOKEN);

  // ----- GET -----
  if (req.method === 'GET') {
    const isAdmin = req.query && req.query.admin === 'true';

    if (isAdmin) {
      const pwd = req.headers['x-admin-password'];
      if (pwd !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Senha incorreta' });
      }
    }

    let produtos = kvConfigured ? await kvGet(KEY) : null;
    if (!Array.isArray(produtos)) produtos = SEED;

    if (isAdmin) {
      return res.status(200).json({ produtos, kvConfigured });
    }

    // Público: filtra estoque zero e remove precoCusto
    const publico = produtos
      .filter(p => Number(p.quantidade) > 0)
      .map(({ precoCusto, ...rest }) => rest);

    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
    return res.status(200).json(publico);
  }

  // ----- PUT (apenas admin) -----
  if (req.method === 'PUT') {
    const pwd = req.headers['x-admin-password'];
    if (pwd !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Senha incorreta' });
    if (!kvConfigured) return res.status(500).json({ error: 'Vercel KV não configurado. Veja SETUP-MERCADINHO.md' });

    const body = req.body;
    if (!Array.isArray(body)) return res.status(400).json({ error: 'Payload precisa ser um array de produtos' });
    if (body.length > 500) return res.status(400).json({ error: 'Muitos produtos (máx 500)' });

    const limpos = body.map(sanitizeProduto).filter(p => p.nome);

    const ok = await kvSet(KEY, limpos);
    if (!ok) return res.status(500).json({ error: 'Falha ao salvar no KV' });

    return res.status(200).json({ ok: true, total: limpos.length });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
