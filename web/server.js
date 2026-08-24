import { createServer } from 'node:http';
import { readFile, existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { buscarEmpresas } from '../coleta/src/maps.js';
import { validarLeadsDeRegistros } from '../coleta/src/validar.js';
import { consultarCNPJ } from '../coleta/src/cnpj.js';
import { exportarPlanilha } from '../coleta/src/exportar-planilha.js';
import { statusAquecimento, iniciarAquecimento } from '../whatsapp-bot/src/warmup.js';
import { podeEnviarAgora } from '../whatsapp-bot/src/limiter.js';

// .env sem dependência extra — Node não carrega .env sozinho antes da 20.6.
if (existsSync('.env')) {
  for (const linha of readFileSync('.env', 'utf8').split('\n')) {
    const m = linha.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const PORT = process.env.PORT || 3000;
const TIPOS = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };

function enviarJSON(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(corpo));
}

function lerCorpo(req) {
  return new Promise((resolve) => {
    let dados = '';
    req.on('data', (c) => (dados += c));
    req.on('end', () => resolve(dados ? JSON.parse(dados) : {}));
  });
}

function lerLeadsCSV() {
  if (!existsSync('coleta/leads.csv')) return [];
  return parse(readFileSync('coleta/leads.csv', 'utf8'), { columns: true, skip_empty_lines: true });
}

const rotas = {
  'POST /api/varredura': async (req, res) => {
    const { nicho, cidade } = await lerCorpo(req);
    if (!nicho || !cidade) return enviarJSON(res, 400, { erro: 'informe nicho e cidade' });
    try {
      const encontrados = await buscarEmpresas(nicho, cidade);
      const resumo = await validarLeadsDeRegistros(
        encontrados.map((e) => ({ ...e, categoria: e.categoria || nicho }))
      );
      enviarJSON(res, 200, { ...resumo, encontrados: encontrados.length });
    } catch (erro) {
      enviarJSON(res, 502, { erro: erro.message });
    }
  },
  'GET /api/leads': async (_req, res) => enviarJSON(res, 200, lerLeadsCSV()),
  'POST /api/cnpj': async (req, res) => {
    const { cnpj } = await lerCorpo(req);
    const resultado = await consultarCNPJ(cnpj).catch((e) => ({ erro: e.message }));
    enviarJSON(res, 200, resultado ?? { erro: 'CNPJ não encontrado / fontes indisponíveis' });
  },
  'GET /api/status': async (_req, res) => {
    enviarJSON(res, 200, { aquecimento: statusAquecimento(), envioHoje: podeEnviarAgora() });
  },
  'POST /api/aquecimento/iniciar': async (_req, res) => enviarJSON(res, 200, iniciarAquecimento()),
  'GET /api/exportar': async (_req, res) => {
    try {
      const caminho = await exportarPlanilha();
      readFile(caminho, (erro, conteudo) => {
        if (erro) return enviarJSON(res, 500, { erro: erro.message });
        res.writeHead(200, {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${caminho.split('/').pop()}"`,
        });
        res.end(conteudo);
      });
    } catch (erro) {
      enviarJSON(res, 400, { erro: erro.message });
    }
  },
};

const servidor = createServer(async (req, res) => {
  const chave = `${req.method} ${req.url.split('?')[0]}`;
  if (rotas[chave]) return rotas[chave](req, res);

  const caminho = req.url === '/' ? '/index.html' : req.url;
  const arquivo = join('web/public', caminho);
  readFile(arquivo, (erro, conteudo) => {
    if (erro) return enviarJSON(res, 404, { erro: 'não encontrado' });
    res.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream' });
    res.end(conteudo);
  });
});

servidor.listen(PORT, () => console.log(`[web] painel rodando em http://localhost:${PORT}`));
