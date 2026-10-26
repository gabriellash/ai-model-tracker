#!/usr/bin/env node
// Local preview of dist/ at http://localhost:4173/ai-model-tracker/ (same path and gzip as GitHub Pages).
// Usage: npm run preview
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
const root = process.argv[2] ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.csv': 'text/csv', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/robots.txt') { res.writeHead(404); return res.end(); }
  if (!p.startsWith('/ai-model-tracker/')) { res.writeHead(302, { location: '/ai-model-tracker/' }); return res.end(); }
  p = p.slice('/ai-model-tracker'.length);
  if (p.endsWith('/')) p += 'index.html';
  try {
    const body = await readFile(path.join(root, path.normalize(p)));
    const gz = /gzip/.test(req.headers['accept-encoding'] ?? '') && !p.endsWith('.png');
    res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream', 'cache-control': 'max-age=600', ...(gz ? { 'content-encoding': 'gzip' } : {}) });
    res.end(gz ? gzipSync(body) : body);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(4173, () => console.log('http://localhost:4173/ai-model-tracker/'));
