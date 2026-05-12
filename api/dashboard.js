import { applyCors, requireAuth, rateLimit, SUPABASE_URL, SUPABASE_KEY, sbHeaders } from './_lib.js';

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  if (applyCors(req, res, 'GET,OPTIONS')) return;
  if (req.method !== 'GET') return res.status(405).end();

  if (!requireAuth(req, res)) return;

  const rl = rateLimit(req, 'dashboard', 60, 60000);
  if (rl.blocked) { res.setHeader('Retry-After', rl.retryAfter); return res.status(429).json({ ok: false, error: 'Rate limit' }); }

  const empty = { ok: true, leads: [], pdfs: [], reunioes: [] };
  if (!SUPABASE_KEY) return res.status(200).json(empty);

  try {
    const h = sbHeaders();
    const [leadsRes, pdfsRes, reunioesRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/hub_leads?select=id,responsavel,status,valor_proposta,created_at`, { headers: h }),
      fetch(`${SUPABASE_URL}/rest/v1/hub_pdfs_gerados?select=id,tipo,responsavel,created_at`, { headers: h }),
      fetch(`${SUPABASE_URL}/rest/v1/hub_reunioes?select=id,responsavel,status,created_at`, { headers: h })
    ]);

    const [leads, pdfs, reunioes] = await Promise.all([
      leadsRes.json(), pdfsRes.json(), reunioesRes.json()
    ]);

    return res.status(200).json({
      ok: true,
      leads: Array.isArray(leads) ? leads : [],
      pdfs: Array.isArray(pdfs) ? pdfs : [],
      reunioes: Array.isArray(reunioes) ? reunioes : []
    });
  } catch (e) {
    console.error('dashboard error', e);
    return res.status(200).json(empty);
  }
}
