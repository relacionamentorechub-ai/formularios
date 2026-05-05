export const config = { maxDuration: 10 };

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ooufmzqdiehrxnqoqvsi.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DESTINO = 'henrique.callefi@gmail.com';
const FROM = process.env.RESEND_FROM || 'REC HUB <onboarding@resend.dev>';

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const username = (body.username || 'anônimo').toString().slice(0, 60);
  const pagina = (body.pagina || '—').toString().slice(0, 80);
  const mensagem = (body.mensagem || '').toString().trim();

  if (mensagem.length < 5) return res.status(400).json({ ok: false, error: 'Mensagem muito curta' });
  if (mensagem.length > 4000) return res.status(400).json({ ok: false, error: 'Mensagem muito longa (máx 4000)' });

  // 1. Salva no Supabase (mesmo que email falhe, registro fica)
  let saved = false;
  if (SUPABASE_KEY) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/hub_suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ username, pagina, mensagem })
      });
      saved = r.ok;
    } catch (e) { console.error('supabase suggestion save', e); }
  }

  // 2. Envia email via Resend
  if (!RESEND_API_KEY) {
    return res.status(200).json({
      ok: true, saved, emailed: false,
      warning: 'RESEND_API_KEY não configurada — sugestão salva, email não enviado'
    });
  }

  const subject = `[REC HUB] Nova sugestão de ${username}`;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc">
      <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0">
        <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#0E7490;margin-bottom:8px">REC HUB · Sugestão</div>
        <h1 style="font-size:18px;color:#0f172a;margin:0 0 18px">Nova sugestão recebida</h1>
        <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:14px">
          <tr><td style="padding:6px 0;color:#64748b;width:90px">De:</td><td style="padding:6px 0;color:#0f172a;font-weight:600">${escapeHtml(username)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Página/aba:</td><td style="padding:6px 0;color:#0f172a">${escapeHtml(pagina)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Quando:</td><td style="padding:6px 0;color:#0f172a">${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td></tr>
        </table>
        <div style="background:#f1f5f9;border-left:3px solid #06B6D4;border-radius:6px;padding:16px;font-size:14px;color:#334155;line-height:1.6;white-space:pre-wrap">${escapeHtml(mensagem)}</div>
      </div>
      <div style="text-align:center;color:#94a3b8;font-size:11px;margin-top:14px">Enviado automaticamente pelo Hub Interno REC</div>
    </div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({ from: FROM, to: [DESTINO], subject, html, reply_to: DESTINO })
    });
    if (!r.ok) {
      const errTxt = await r.text();
      console.error('resend error', r.status, errTxt);
      return res.status(200).json({ ok: true, saved, emailed: false, warning: 'Falha ao enviar email — sugestão salva' });
    }
    return res.status(200).json({ ok: true, saved, emailed: true });
  } catch (e) {
    console.error('resend exception', e);
    return res.status(200).json({ ok: true, saved, emailed: false, warning: 'Erro ao enviar email' });
  }
}
