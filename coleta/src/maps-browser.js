// Raspagem via navegador de verdade (Playwright) — abre o Google Maps,
// rola a lista de resultados, clica em cada um pra ler o telefone no
// painel de detalhe. É gratuito (sem chave, sem serviço pago) porque
// roda na sua máquina em vez de pagar um serviço pra fazer isso — mesma
// técnica que o Apify vende, só que sem intermediário.
//
// AVISO HONESTO: viola os Termos de Uso do Google (mesma categoria de
// risco do Apify/TomTom scraping, já aceita pelo diretor). Em volume
// pequeno/ocasional tende a funcionar; em uso pesado e contínuo o
// Google aplica CAPTCHA e bloqueia o IP — o Apify paga justamente por
// infraestrutura de proxy pra contornar isso em escala, o que este
// script não tem. Seletores de DOM podem quebrar quando o Google muda
// o layout — se parar de funcionar, é isso.
//
// Trava de verdade (decisão do diretor, não promessa de prompt): até
// 60 números/dia, pausa de 3-15min entre cada clique — ver
// coleta/src/limiter-navegador.js. Pára sozinho no meio do lote se o
// teto do dia bater.
//
// Requer: npx playwright install chromium (uma vez, depois de npm install)

import { chromium } from 'playwright';
import { podeRasparAgora, registrarRaspagem, proximaPausaMs } from './limiter-navegador.js';

const ESPERA_CURTA = 1500;

export async function buscarGoogleMapsBrowser(nicho, cidade, opcoes = {}) {
  const maxResultados = opcoes.maxResultados ?? 20;
  const navegador = await chromium.launch({ headless: true });
  const pagina = await navegador.newPage({ locale: 'pt-BR' });
  const resultados = [];

  try {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(`${nicho} ${cidade}`)}`;
    await pagina.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await pagina.waitForSelector('div[role="feed"]', { timeout: 15000 }).catch(() => null);

    // Google Maps carrega resultado por scroll (lazy load) — rola a
    // lista algumas vezes pra juntar mais candidatos antes de extrair.
    const feed = pagina.locator('div[role="feed"]');
    for (let i = 0; i < 6; i++) {
      await feed.evaluate((el) => el.scrollBy(0, 800)).catch(() => null);
      await pagina.waitForTimeout(ESPERA_CURTA);
    }

    const cards = await pagina.locator('div[role="feed"] > div a[href*="/maps/place/"]').all();

    for (const card of cards.slice(0, maxResultados)) {
      // Trava de verdade, não promessa de prompt: até 60/dia (decisão
      // do diretor), pausa significativa (3-15min) entre cada clique —
      // pára a raspagem no meio se o teto do dia bater, não força o
      // resto do lote.
      const verificacao = podeRasparAgora();
      if (!verificacao.pode) {
        console.log(`[maps-browser] parando: ${verificacao.motivo}.`);
        break;
      }

      try {
        await card.click();
        await pagina.waitForTimeout(ESPERA_CURTA);

        const nome = await pagina.locator('h1').first().textContent().catch(() => '');
        const telefone = await pagina
          .locator('button[data-item-id^="phone:"]')
          .first()
          .getAttribute('aria-label')
          .catch(() => null);
        const site = await pagina
          .locator('a[data-item-id="authority"]')
          .first()
          .getAttribute('href')
          .catch(() => null);
        const categoria = await pagina
          .locator('button[jsaction*="category"]')
          .first()
          .textContent()
          .catch(() => nicho);

        resultados.push({
          nome: (nome ?? '').trim(),
          telefone: (telefone ?? '').replace(/^Telefone:\s*/i, '').trim(),
          categoria: (categoria ?? nicho).trim(),
          cidade,
          site: site ?? '',
          fonte: 'maps-browser',
        });
        registrarRaspagem();
        await pagina.waitForTimeout(proximaPausaMs());
      } catch {
        // um card falhou (DOM mudou, elemento sumiu) — segue pro próximo
      }
    }
  } finally {
    await navegador.close();
  }

  return resultados.filter((r) => r.nome);
}

// CLI: node coleta/src/maps-browser.js "barbearia" "Serra, ES"
if (import.meta.url === `file://${process.argv[1]}`) {
  const [nicho, cidade] = process.argv.slice(2);
  if (!nicho || !cidade) {
    console.error('uso: node coleta/src/maps-browser.js "<nicho>" "<cidade>"');
    process.exit(1);
  }
  buscarGoogleMapsBrowser(nicho, cidade)
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => console.error('[maps-browser] erro:', e.message));
}
