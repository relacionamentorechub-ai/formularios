import crypto from 'node:crypto';
import { applyCors, readBody, rateLimit, SUPABASE_URL, SUPABASE_KEY, sbHeaders } from './_lib.js';

export const config = { maxDuration: 10 };

// Fallbacks preservados para não bloquear a equipe se a env var estiver
// ausente na Vercel. Para hardening definitivo, defina MASTER_PASSWORD e
// AUTH_SECRET no painel da Vercel e remova os defaults daqui.
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'prosperidade@';
const AUTH_SECRET = process.env.AUTH_SECRET || 'rec-hub-dev-secret-change-me';
const TOKEN_TTL_DAYS = 30;
const PASSWORD_MIN = 4;

function hashPassword(plain, salt) {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, useSalt, 64).toString('hex');
  return `${useSalt}:${hash}`;
}

function verifyPassword(plain, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(plain, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
  } catch { return false; }
}

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

async function sbGet(table, query) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: sbHeaders() });
  if (!r.ok) throw new Error(`Supabase GET ${table}: ${r.status}`);
  return r.json();
}

async function sbInsert(table, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Supabase INSERT ${table}: ${r.status} ${err}`);
  }
  return r.json();
}

async function sbPatch(table, query, body) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: sbHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify(body)
  });
}

function ok(res, data) { res.status(200).json({ ok: true, ...data }); }
function fail(res, status, msg) { res.status(status).json({ ok: false, error: msg }); }

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST,OPTIONS')) return;
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido');

  if (!SUPABASE_KEY) return fail(res, 500, 'SUPABASE_KEY não configurada');

  const body = readBody(req);
  const action = body.action;

  // Rate limit por ação sensível: 10 tentativas por minuto por IP
  if (action === 'login' || action === 'verify_master' || action === 'signup') {
    const rl = rateLimit(req, 'auth:' + action, 10, 60000);
    if (rl.blocked) {
      res.setHeader('Retry-After', rl.retryAfter);
      return fail(res, 429, `Muitas tentativas. Tente em ${rl.retryAfter}s.`);
    }
  }

  try {
    if (action === 'verify_master') {
      const { masterPassword } = body;
      if (typeof masterPassword !== 'string') return fail(res, 400, 'Senha obrigatória');
      const a = Buffer.from(masterPassword);
      const b = Buffer.from(MASTER_PASSWORD);
      const matchLen = a.length === b.length && crypto.timingSafeEqual(a, b);
      if (!matchLen) return fail(res, 401, 'Senha da empresa incorreta');
      return ok(res, { verified: true });
    }

    if (action === 'signup') {
      const { masterPassword, username, password } = body;
      if (typeof masterPassword !== 'string') return fail(res, 400, 'Senha-mestra obrigatória');
      const a = Buffer.from(masterPassword);
      const b = Buffer.from(MASTER_PASSWORD);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fail(res, 401, 'Senha-mestra incorreta');
      if (!username || typeof username !== 'string' || username.trim().length < 3) return fail(res, 400, 'Nome de usuário muito curto');
      if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username.trim())) return fail(res, 400, 'Nome de usuário inválido (use letras, números, . _ -)');
      if (!password || typeof password !== 'string' || password.length < PASSWORD_MIN) return fail(res, 400, `Senha muito curta (mín. ${PASSWORD_MIN} caracteres)`);

      const u = username.trim();
      const exists = await sbGet('hub_users', `username=eq.${encodeURIComponent(u)}&select=id`);
      if (exists.length) return fail(res, 409, 'Já existe usuário com esse nome');

      const password_hash = hashPassword(password);
      await sbInsert('hub_users', { username: u, password_hash });

      const token = signToken({ u, iat: Date.now(), exp: Date.now() + TOKEN_TTL_DAYS * 86400000 });
      return ok(res, { token, username: u });
    }

    if (action === 'login') {
      const { username, password } = body;
      if (!username || !password) return fail(res, 400, 'Usuário e senha obrigatórios');
      const u = String(username).trim();
      if (!/^[a-zA-Z0-9._-]{3,40}$/.test(u)) return fail(res, 401, 'Usuário ou senha inválidos');

      const rows = await sbGet('hub_users', `username=eq.${encodeURIComponent(u)}&select=id,password_hash`);
      if (!rows.length) return fail(res, 401, 'Usuário ou senha inválidos');
      if (!verifyPassword(String(password), rows[0].password_hash)) return fail(res, 401, 'Usuário ou senha inválidos');

      await sbPatch('hub_users', `id=eq.${rows[0].id}`, { last_login: new Date().toISOString() });
      const token = signToken({ u, iat: Date.now(), exp: Date.now() + TOKEN_TTL_DAYS * 86400000 });
      return ok(res, { token, username: u });
    }

    if (action === 'verify') {
      const { token } = body;
      const payload = verifyToken(token);
      if (!payload) return fail(res, 401, 'Token inválido ou expirado');
      return ok(res, { username: payload.u });
    }

    return fail(res, 400, 'Ação inválida');
  } catch (e) {
    console.error('auth error', e);
    return fail(res, 500, 'Erro interno');
  }
}
