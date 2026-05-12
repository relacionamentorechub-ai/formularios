import { applyCors, requireAuth, rateLimit } from './_lib.js';

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST,OPTIONS')) return;
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireAuth(req, res)) return;

  const rl = rateLimit(req, 'pdf', 30, 60000);
  if (rl.blocked) { res.setHeader('Retry-After', rl.retryAfter); return res.status(429).json({ error: 'Rate limit' }); }

  const apiKey = process.env.PDFSHIFT_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'PDFShift key not configured' });

  const { html, filename } = req.body || {};
  if (!html || typeof html !== 'string') return res.status(400).json({ error: 'HTML required' });
  if (html.length > 5_000_000) return res.status(413).json({ error: 'HTML muito grande' });

  const pdfRes = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from('api:' + apiKey).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: html,
      format: 'A4',
      margin: '0',
      use_print: true,
    }),
  });

  if (!pdfRes.ok) {
    const err = await pdfRes.text();
    console.error('pdfshift error', err);
    return res.status(500).json({ error: 'Erro ao gerar PDF' });
  }

  const buffer = Buffer.from(await pdfRes.arrayBuffer());
  const name = String(filename || 'diagnostico.pdf').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}
