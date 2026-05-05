export const config = { maxDuration: 10 };

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ooufmzqdiehrxnqoqvsi.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function sbHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!SUPABASE_KEY) return res.status(500).json({ ok: false, error: 'Supabase não configurado' });

  // ── GET: listar leads ──────────────────────────────────────────
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
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // ── POST: criar lead ou registrar PDF ─────────────────────────
  if (req.method === 'POST') {
    if (body.action === 'pdf') {
      const { tipo, responsavel, cliente, instagram } = body;
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/hub_pdfs_gerados`, {
          method: 'POST',
          headers: { ...sbHeaders(), Prefer: 'return=minimal' },
          body: JSON.stringify({
            tipo: tipo || 'analise',
            responsavel: (responsavel || 'equipe').toString().slice(0, 60),
            cliente: (cliente || '').toString().slice(0, 120),
            instagram: (instagram || '').toString().slice(0, 80)
          })
        });
        return res.status(200).json({ ok: r.ok });
      } catch (e) {
        return res.status(200).json({ ok: false });
      }
    }

    const { nome_empresa, instagram, segmento, cidade, responsavel, valor_proposta, plano, observacoes } = body;
    if (!nome_empresa) return res.status(400).json({ ok: false, error: 'nome_empresa obrigatório' });

    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/hub_leads`, {
        method: 'POST',
        headers: { ...sbHeaders(), Prefer: 'return=representation' },
        body: JSON.stringify({
          nome_empresa: nome_empresa.toString().slice(0, 120),
          instagram: (instagram || '').toString().slice(0, 80),
          segmento: (segmento || '').toString().slice(0, 80),
          cidade: (cidade || '').toString().slice(0, 80),
          responsavel: (responsavel || 'equipe').toString().slice(0, 60),
          valor_proposta: valor_proposta ? parseFloat(valor_proposta) : null,
          plano: (plano || '').toString().slice(0, 60),
          observacoes: (observacoes || '').toString().slice(0, 2000),
          status: 'novo'
        })
      });
      const data = await r.json();
      return res.status(200).json({ ok: r.ok, data: Array.isArray(data) ? data[0] : data });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // ── PATCH: atualizar status / dados ───────────────────────────
  if (req.method === 'PATCH') {
    const { id, status, valor_proposta, plano, observacoes } = body;
    if (!id) return res.status(400).json({ ok: false, error: 'id obrigatório' });

    const updates = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (valor_proposta !== undefined) updates.valor_proposta = valor_proposta ? parseFloat(valor_proposta) : null;
    if (plano !== undefined) updates.plano = plano;
    if (observacoes !== undefined) updates.observacoes = observacoes;

    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/hub_leads?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...sbHeaders(), Prefer: 'return=minimal' },
        body: JSON.stringify(updates)
      });
      return res.status(200).json({ ok: r.ok });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // ── DELETE: remover lead ───────────────────────────────────────
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
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Método não permitido' });
}
