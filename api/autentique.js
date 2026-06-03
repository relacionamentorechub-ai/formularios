import { applyCors, requireAuth } from './_lib.js';

const AUTENTIQUE_URL = 'https://api.autentique.com.br/v2/graphql';
const REC_EMAIL = 'relacionamento.rechub@gmail.com';
const REC_NAME = 'Francielle Caleffi — REC HUB';

// GraphQL multipart upload spec: https://github.com/jaydenseric/graphql-multipart-request-spec
function buildMultipartRequest(query, variables, fileBuffer, fileFieldPath) {
  const operations = JSON.stringify({ query, variables });
  const map = JSON.stringify({ '0': [fileFieldPath] });

  const form = new FormData();
  form.append('operations', operations);
  form.append('map', map);
  form.append('0', new Blob([fileBuffer], { type: 'application/pdf' }), 'contrato.pdf');
  return form;
}

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST,OPTIONS')) return;
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireAuth(req, res)) return;

  const autKey = process.env.AUTENTIQUE_API_KEY;
  if (!autKey) return res.status(500).json({ error: 'Autentique não configurado' });

  const pdfKey = process.env.PDFSHIFT_API_KEY;
  if (!pdfKey) return res.status(500).json({ error: 'PDFShift não configurado' });

  const { html, contractName, clientName, clientEmail } = req.body || {};
  if (!html || typeof html !== 'string') return res.status(400).json({ error: 'HTML obrigatório' });
  if (!clientEmail) return res.status(400).json({ error: 'E-mail do contratante obrigatório' });
  if (html.length > 5_000_000) return res.status(413).json({ error: 'HTML muito grande' });

  // Gera o PDF via PDFShift
  const pdfRes = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from('api:' + pdfKey).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source: html, format: 'A4', margin: '0', use_print: true }),
  });

  if (!pdfRes.ok) {
    const err = await pdfRes.text();
    console.error('pdfshift error', err);
    return res.status(500).json({ error: 'Erro ao gerar PDF' });
  }

  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
  const name = String(contractName || `Contrato REC HUB — ${clientName || clientEmail}`).slice(0, 255);

  const mutation = `
    mutation CreateDocument($document: DocumentInput!, $signatories: [SignatoryInput!]!) {
      createDocument(document: $document, signatories: $signatories) {
        id
        name
        signatures {
          public_id
          name
          email
          link
          action { name }
        }
      }
    }
  `;

  const variables = {
    document: {
      name,
      content: null,
      refusable: false,
      sortable: false,
    },
    signatories: [
      { name: REC_NAME, email: REC_EMAIL, action: 'SIGN' },
      { name: clientName || 'Contratante', email: clientEmail, action: 'SIGN' },
    ],
  };

  const form = buildMultipartRequest(mutation, variables, pdfBuffer, 'variables.document.content');

  const autRes = await fetch(AUTENTIQUE_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${autKey}` },
    body: form,
  });

  const autText = await autRes.text();

  let autJson;
  try { autJson = JSON.parse(autText); } catch {
    return res.status(500).json({ error: 'Autentique retornou resposta inválida: ' + autText.slice(0, 200) });
  }

  if (autJson.errors?.length) {
    const msg = autJson.errors[0]?.message || 'Erro desconhecido';
    console.error('autentique errors:', JSON.stringify(autJson.errors));
    return res.status(500).json({ error: 'Autentique: ' + msg });
  }

  const doc = autJson.data?.createDocument;
  if (!doc) {
    console.error('autentique: createDocument null:', autText.slice(0, 500));
    return res.status(500).json({ error: 'Documento não criado — resposta: ' + autText.slice(0, 300) });
  }

  const sigs = doc.signatures || [];
  const clientSig = sigs.find(s => s.email === clientEmail);
  const recSig = sigs.find(s => s.email === REC_EMAIL);

  return res.json({
    id: doc.id,
    name: doc.name,
    clientLink: clientSig?.link || null,
    recLink: recSig?.link || null,
  });
}
