import crypto from 'node:crypto';
import { applyCors, readBody, rateLimit } from './_lib.js';

export const config = { maxDuration: 10 };

// Acesso por nome, sem senha (pedido da CEO). Basta digitar o nome.
// Case-insensitive: "Paola", "PAOLA" e "paola" entram igual.
// Para adicionar/remover quem entra, edite USUARIOS.
// chave = nome digitado (minúsculo) ; valor = nome exibido no Hub
const USUARIOS = {
  paola: 'Paola',
  jaque: 'Jaque',
  henrique: 'Henrique',
  fran: 'Fran',
};

const AUTH_SECRET = process.env.AUTH_SECRET || 'rec-hub-dev-secret-change-me';
const TOKEN_TTL_DAYS = 30;

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString();
}

function signToken(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(body).digest();
  return `${body}.${b64url(sig)}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expectedSig = b64url(crypto.createHmac('sha256', AUTH_SECRET).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

function ok(res, data) { res.status(200).json({ ok: true, ...data }); }
function fail(res, status, msg) { res.status(status).json({ ok: false, error: msg }); }

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST,OPTIONS')) return;
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido');

  const body = readBody(req);
  const action = body.action;

  if (action === 'login') {
    const rl = rateLimit(req, 'auth:login', 20, 60000);
    if (rl.blocked) {
      res.setHeader('Retry-After', rl.retryAfter);
      return fail(res, 429, `Muitas tentativas. Tente em ${rl.retryAfter}s.`);
    }
    const nome = String(body.nome || '').trim().toLowerCase();
    if (!nome) return fail(res, 400, 'Digite seu nome');
    const display = USUARIOS[nome];
    if (!display) return fail(res, 401, 'Nome não reconhecido');

    const token = signToken({ u: display, iat: Date.now(), exp: Date.now() + TOKEN_TTL_DAYS * 86400000 });
    return ok(res, { token, username: display });
  }

  if (action === 'verify') {
    const payload = verifyToken(body.token);
    if (!payload) return fail(res, 401, 'Token inválido ou expirado');
    return ok(res, { username: payload.u });
  }

  return fail(res, 400, 'Ação inválida');
}
