import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const bundlePath = fileURLToPath(new URL("./.generated/harness.js", import.meta.url));
const generatedDir = fileURLToPath(new URL("./.generated/", import.meta.url));
const html = `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>autoqueue test</title></head>
<body><main id="root"></main><script src="/harness.js"></script></body>
</html>`;

const server = createServer((req, res) => {
  if (req.url === "/harness.js") {
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
    createReadStream(bundlePath).pipe(res);
    return;
  }
  const pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
  const assetName = decodeURIComponent(pathname.slice(1));
  if (/^[a-zA-Z0-9._-]+\.(?:png|webp|svg)$/.test(assetName)) {
    const assetPath = generatedDir + assetName;
    if (existsSync(assetPath)) {
      const contentType = assetName.endsWith(".svg") ? "image/svg+xml" : assetName.endsWith(".webp") ? "image/webp" : "image/png";
      res.writeHead(200, { "content-type": contentType, "cache-control": "no-store" });
      createReadStream(assetPath).pipe(res);
      return;
    }
  }
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

server.listen(4173, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
