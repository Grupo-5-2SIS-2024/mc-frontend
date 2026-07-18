const express = require("express");
const path = require("path");
const http = require("http");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

const publicDir = path.join(__dirname, "src");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function proxyToBackend(req, res) {
  const targetPath = req.path;
  const targetUrl = new URL(`${BACKEND_URL}${targetPath}${req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : ""}`);

  const options = {
    protocol: targetUrl.protocol,
    hostname: targetUrl.hostname,
    port: targetUrl.port || 8080,
    path: `${targetUrl.pathname}${targetUrl.search}`,
    method: req.method,
    headers: { ...req.headers, host: targetUrl.host }
  };

  delete options.headers["content-length"];

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (error) => {
    res.status(502).json({ error: "Falha ao acessar o backend", detail: error.message });
  });

  if (req.method !== "GET" && req.method !== "HEAD") {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

app.use((req, res, next) => {
  if (req.path.startsWith("/mc/") || req.path === "/notas" || req.path === "/acompanhamentos") {
    return proxyToBackend(req, res);
  }
  next();
});

app.use(express.static(publicDir));

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
