import { applyCors, requireAuth, readBody, rateLimit, SUPABASE_URL, SUPABASE_KEY, sbHeaders } from './_lib.js';

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  if (applyCors(req, res, 'GET,POST,PATCH,DELETE,OPTIONS')) return;
  if (!SUPABASE_KEY) return res.status(500).json({ ok: false, error: 'Supabase não configurado' });

  if (!requireAuth(req, res)) return;

  const rl = rateLimit(req, 'leads', 120, 60000);
  if (rl.blocked) { res.setHeader('Retry-After', rl.retryAfter); return res.status(429).json({ ok: false, error: 'Rate limit' }); }

  if (req.method === 'GET') {
    const { responsavel, status } = req.query;
    let url = `${SUPABASE_URL}/rest/v1/hub_leads?order=created_at.desc&select=*`;
    if (responsavel && responsavel !== 'todas') url += `&responsavel=eq.${encodeURIComponent(responsavel)}`;
    if (status) url += `&status=eq.${encodeURIComponent(status)}`;
    try {
      const r = await fetch(url, { headers: sbHeaders() });
      const data = await r.json();
      return res.status(200).json({ ok: true, data: Array.isArray(data) ? data : [] });
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'Erro Supabase' });
    }
  }

  const body = readBody(req);

  if (req.method === 'POST') {
    if (body.action === 'pdf') {
      const { tipo, responsavel, cliente, instagram } = body;
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/hub_pdfs_gerados`, {
          method: 'POST',
          headers: sbHeaders({ Prefer: 'return=minimal' }),
          body: JSON.stringify({
            tipo: String(tipo || 'analise').slice(0, 40),
            responsavel: String(responsavel || 'equipe').slice(0, 60),
            cliente: String(cliente || '').slice(0, 120),
            instagram: String(instagram || '').slice(0, 80)
          })
        });
        return res.status(200).json({ ok: r.ok });
      } catch {
        return res.status(200).json({ ok: false });
      }
    }

    const { nome_empresa, instagram, segmento, cidade, responsavel, valor_proposta, plano, observacoes } = body;
    if (!nome_empresa || typeof nome_empresa !== 'string') return res.status(400).json({ ok: false, error: 'nome_empresa obrigatório' });

    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/hub_leads`, {
        method: 'POST',
        headers: sbHeaders({ Prefer: 'return=representation' }),
        body: JSON.stringify({
          nome_empresa: String(nome_empresa).slice(0, 120),
          instagram: String(instagram || '').slice(0, 80),
          segmento: String(segmento || '').slice(0, 80),
          cidade: String(cidade || '').slice(0, 80),
          responsavel: String(responsavel || 'equipe').slice(0, 60),
          valor_proposta: valor_proposta ? Number(parseFloat(valor_proposta)) || null : null,
          plano: String(plano || '').slice(0, 60),
          observacoes: String(observacoes || '').slice(0, 2000),
          status: 'novo'
        })
      });
      const data = await r.json();
      return res.status(200).json({ ok: r.ok, data: Array.isArray(data) ? data[0] : data });
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'Erro Supabase' });
    }
  }

  if (req.method === 'PATCH') {
    const { id, status, valor_proposta, plano, observacoes } = body;
    if (!id) return res.status(400).json({ ok: false, error: 'id obrigatório' });

    const updates = { updated_at: new Date().toISOString() };
    if (status) updates.status = String(status).slice(0, 30);
    if (valor_proposta !== undefined) updates.valor_proposta = valor_proposta ? Number(parseFloat(valor_proposta)) || null : null;
    if (plano !== undefined) updates.plano = String(plano).slice(0, 60);
    if (observacoes !== undefined) updates.observacoes = String(observacoes).slice(0, 2000);

    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/hub_leads?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: sbHeaders({ Prefer: 'return=minimal' }),
        body: JSON.stringify(updates)
      });
      return res.status(200).json({ ok: r.ok });
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'Erro Supabase' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = body;
    if (!id) return res.status(400).json({ ok: false, error: 'id obrigatório' });
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/hub_leads?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: sbHeaders()
      });
      return res.status(200).json({ ok: r.ok });
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'Erro Supabase' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Método não permitido' });
}
