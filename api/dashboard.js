export const config = { maxDuration: 10 };

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ooufmzqdiehrxnqoqvsi.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const empty = { ok: true, leads: [], pdfs: [], reunioes: [] };
  if (!SUPABASE_KEY) return res.status(200).json(empty);

  const h = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`
  };

  try {
    const [leadsRes, pdfsRes, reunioesRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/hub_leads?select=id,responsavel,status,valor_proposta,created_at`, { headers: h }),
      fetch(`${SUPABASE_URL}/rest/v1/hub_pdfs_gerados?select=id,tipo,responsavel,created_at`, { headers: h }),
      fetch(`${SUPABASE_URL}/rest/v1/hub_reunioes?select=id,responsavel,status,created_at`, { headers: h })
    ]);

    const [leads, pdfs, reunioes] = await Promise.all([
      leadsRes.json(),
      pdfsRes.json(),
      reunioesRes.json()
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
