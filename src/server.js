import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
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
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, '127.0.0.1', () => {
    console.log(`The Apothecary's Ghost is open at http://localhost:${port}`);
  });
}
