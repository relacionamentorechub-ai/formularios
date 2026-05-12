// Utilitários compartilhados pelas funções serverless.
// Centraliza: CORS, headers do Supabase, verificação de token, rate limit.

import crypto from 'node:crypto';

export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ooufmzqdiehrxnqoqvsi.supabase.co';
export const SUPABASE_KEY = process.env.SUPABASE_KEY;
// Mantém o mesmo fallback de api/auth.js para não dessincronizar a verificação
// de token quando a env var não está definida.
const AUTH_SECRET = process.env.AUTH_SECRET || 'rec-hub-dev-secret-change-me';

export function sbHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...extra
  };
}

// CORS restrito: só permite a própria origem (same-site) ou nenhuma origem (server-to-server).
export function applyCors(req, res, methods = 'GET,POST,OPTIONS') {
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  const sameOrigin = origin === '' || origin.endsWith('://' + host);
  if (sameOrigin && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return req.method === 'OPTIONS' ? (res.status(204).end(), true) : false;
}

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString();
}
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expectedSig = b64url(crypto.createHmac('sha256', AUTH_SECRET).update(body).digest());
  // timing-safe compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

// Lê o token do header Authorization (preferido), body._token ou query._token.
function extractToken(req) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth && auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  if (req.body && typeof req.body === 'object' && req.body._token) return req.body._token;
  if (req.query && req.query._token) return req.query._token;
  return null;
}

// Bloqueia a request se não houver token válido. Retorna o payload ou null (já respondeu 401).
export function requireAuth(req, res) {
  const token = extractToken(req);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ ok: false, error: 'Não autenticado' });
    return null;
  }
  return payload;
}

// Rate limit simples in-memory por IP (vale dentro do mesmo container quente).
// Não é defesa absoluta contra ataque distribuído, mas trava brute-force simples.
const _hits = new Map();
export function rateLimit(req, key, max = 10, windowMs = 60000) {
  const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim()
    || req.socket?.remoteAddress || 'unknown';
  const id = key + ':' + ip;
  const now = Date.now();
  const rec = _hits.get(id) || { count: 0, resetAt: now + windowMs };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + windowMs; }
  rec.count++;
  _hits.set(id, rec);
  // limpeza barata
  if (_hits.size > 2000) {
    for (const [k, v] of _hits) if (now > v.resetAt) _hits.delete(k);
  }
  return rec.count > max
    ? { blocked: true, retryAfter: Math.ceil((rec.resetAt - now) / 1000) }
    : { blocked: false };
}

export function readBody(req) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  return body || {};
}
