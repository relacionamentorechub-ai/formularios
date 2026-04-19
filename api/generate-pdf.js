export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.PDFSHIFT_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'PDFShift key not configured' });

  const { html, filename } = req.body;
  if (!html) return res.status(400).json({ error: 'HTML required' });

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
      use_print: false,
    }),
  });

  if (!pdfRes.ok) {
    const err = await pdfRes.text();
    return res.status(500).json({ error: 'Erro ao gerar PDF: ' + err });
  }

  const buffer = Buffer.from(await pdfRes.arrayBuffer());
  const name = (filename || 'diagnostico.pdf').replace(/[^a-zA-Z0-9._-]/g, '-');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}
