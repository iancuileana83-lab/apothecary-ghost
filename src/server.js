import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { askGemma, chatTurn, RateLimiter } from './chat.js';
import { loadEnv } from './env.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, '..', 'public');
const factsFile = path.join(root, '..', 'data', 'facts.json');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

const headers = {
  'Content-Security-Policy':
    "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data: blob:; base-uri 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

const MAX_BODY = 8 * 1024;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size <= MAX_BODY) chunks.push(chunk);
    });
    req.on('end', () => {
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('too large'), { status: 413 }));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('bad json'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

// options (all optional, mainly for tests): ask, apiKey, model, limiter
export function createServer(options = {}) {
  const limiter = options.limiter ?? new RateLimiter();
  let facts;
  const loadFacts = async () => (facts ??= JSON.parse(await readFile(factsFile, 'utf8')));

  async function chat(req, res) {
    const f = await loadFacts();
    const refusals = f.ghost.refusals;
    const send = (status, body) =>
      res.writeHead(status, { ...headers, 'Content-Type': types['.json'] }).end(JSON.stringify(body));

    if (!limiter.allow(req.socket.remoteAddress ?? 'local')) {
      return send(429, { reply: refusals.slow, kind: 'slow' });
    }
    let payload;
    try {
      payload = await readJson(req);
    } catch (err) {
      return send(err.status ?? 400, { reply: refusals.short, kind: 'short' });
    }
    const result = await chatTurn({
      message: payload?.message,
      history: payload?.history,
      facts: f,
      apiKey: options.apiKey ?? process.env.GEMINI_API_KEY,
      model: options.model ?? process.env.GEMMA_MODEL ?? 'gemma-4-26b-a4b-it',
      ask: options.ask ?? askGemma,
    });
    send(200, result);
  }

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'POST' && url.pathname === '/api/chat') {
        await chat(req, res);
        return;
      }
      if (req.method !== 'GET') {
        res.writeHead(405, headers).end('Method not allowed');
        return;
      }
      if (url.pathname === '/api/facts') {
        const body = await readFile(factsFile);
        res.writeHead(200, { ...headers, 'Content-Type': types['.json'] }).end(body);
        return;
      }
      const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1);
      const file = path.resolve(publicDir, rel);
      if (!file.startsWith(publicDir + path.sep)) {
        res.writeHead(403, headers).end('Forbidden');
        return;
      }
      const body = await readFile(file);
      const type = types[path.extname(file)] ?? 'application/octet-stream';
      res.writeHead(200, { ...headers, 'Content-Type': type }).end(body);
    } catch (err) {
      const status = err.code === 'ENOENT' || err.code === 'EISDIR' ? 404 : 500;
      res.writeHead(status, headers).end(status === 404 ? 'Not found' : 'Server error');
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  loadEnv();
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, '127.0.0.1', () => {
    console.log(`The Apothecary's Ghost is open at http://localhost:${port}`);
    console.log(process.env.GEMINI_API_KEY ? 'Ghost chat: key found in .env.' : 'Ghost chat: no GEMINI_API_KEY in .env yet.');
  });
}
