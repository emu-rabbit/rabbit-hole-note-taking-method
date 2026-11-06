import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { noteFile } from './library.mjs';

const output = fileURLToPath(new URL('../../dist', import.meta.url));
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.zip', 'application/zip'],
]);

const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'");

  if (!/^(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(request.headers.host ?? '')) {
    response.writeHead(403).end();
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  if (!request.url?.startsWith('/')) {
    response.writeHead(400).end();
    return;
  }

  try {
    const url = new URL(`http://localhost${request.url}`);
    const legacyNote = url.pathname === '/' && url.searchParams.get('note');
    if (legacyNote) {
      url.searchParams.delete('note');
      response.writeHead(302, { Location: `/reader/${noteFile(legacyNote)}${url.search}` }).end();
      return;
    }
    if (['/reader', '/reader-en'].includes(url.pathname)) {
      response.writeHead(302, { Location: `${url.pathname}/${url.search}` }).end();
      return;
    }

    const path = decodeURIComponent(url.pathname);
    const filename = resolve(output, `.${path.endsWith('/') ? `${path}index.html` : path}`);
    const contentType = types.get(extname(filename));
    if (!filename.startsWith(output + sep) || !contentType) {
      response.writeHead(404).end();
      return;
    }
    const body = await readFile(filename);
    response.writeHead(200, { 'Content-Type': contentType }).end(body);
  } catch (error) {
    response.writeHead(error instanceof URIError ? 400 : 404).end();
  }
});

const port = Number(process.env.PORT ?? 4173);
server.listen(port, '127.0.0.1', () => {
  console.log(`兔子洞筆記法 http://127.0.0.1:${server.address().port}`);
});
