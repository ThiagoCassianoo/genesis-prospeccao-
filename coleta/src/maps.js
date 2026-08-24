// Descoberta de empresa local por nicho+região — o papel que seria do
// "Google Maps scraping". Duas fontes, mesma saída normalizada; escolhe
// pela env var disponível. Nenhuma delas passa pelo MCP (MCP só existe
// dentro de uma sessão do Claude) — chamada HTTP direta, roda sozinho
// via cron/CLI, sem depender de conversa aberta.

const TOMTOM_KEY = process.env.TOMTOM_API_KEY;
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

// Apify "Google Maps Extractor" (compass/google-maps-extractor) — a
// fonte mais rica (telefone, site, categoria, avaliação), mas: (1) pago
// além do crédito grátis (~US$5/mês no plano free), (2) raspa Google
// Maps direto, o que viola os Termos de Uso do Google — mesma categoria
// de risco que o bot de WhatsApp não-oficial (decisão já aceita pelo
// diretor, ver docs/decisoes-locais.md). Signup: https://console.apify.com/
async function buscarApify(nicho, cidade) {
  const url = `https://api.apify.com/v2/acts/compass~google-maps-extractor/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;
  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchStringsArray: [`${nicho} ${cidade}`],
      maxCrawledPlacesPerSearch: 50,
      language: 'pt-BR',
      countryCode: 'br',
    }),
  });
  if (!resposta.ok) throw new Error(`Apify ${resposta.status}: ${await resposta.text()}`);
  const lugares = await resposta.json();

  return lugares.map((p) => ({
    nome: p.title ?? '',
    telefone: p.phone ?? p.phoneUnformatted ?? '',
    categoria: p.categoryName ?? nicho,
    cidade: p.city ?? cidade,
    site: p.website ?? '',
    fonte: 'apify',
  }));
}

// TomTom Search API — signup grátis, sem cartão, 2500 req/dia:
// https://developer.tomtom.com/user/register
async function buscarTomTom(nicho, cidade) {
  const url = new URL(`https://api.tomtom.com/search/2/search/${encodeURIComponent(`${nicho} ${cidade}`)}.json`);
  url.searchParams.set('key', TOMTOM_KEY);
  url.searchParams.set('countrySet', 'BR');
  url.searchParams.set('limit', '100');

  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`TomTom ${resposta.status}: ${await resposta.text()}`);
  const dado = await resposta.json();

  return (dado.results ?? []).map((r) => ({
    nome: r.poi?.name ?? '',
    telefone: r.poi?.phone ?? '',
    categoria: r.poi?.categories?.[0] ?? nicho,
    cidade: r.address?.municipality ?? cidade,
    site: r.poi?.url ?? '',
    fonte: 'tomtom',
  }));
}

// Google Places API (Text Search) — precisa projeto no Google Cloud +
// billing ativado (tem US$200/mês de crédito grátis):
// https://console.cloud.google.com/google/maps-apis/start
async function buscarGooglePlaces(nicho, cidade) {
  const url = new URL('https://places.googleapis.com/v1/places:searchText');
  const resposta = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.internationalPhoneNumber,places.websiteUri,places.formattedAddress',
    },
    body: JSON.stringify({ textQuery: `${nicho} em ${cidade}` }),
  });
  if (!resposta.ok) throw new Error(`Places ${resposta.status}: ${await resposta.text()}`);
  const dado = await resposta.json();

  return (dado.places ?? []).map((p) => ({
    nome: p.displayName?.text ?? '',
    telefone: p.internationalPhoneNumber ?? '',
    categoria: nicho,
    cidade,
    site: p.websiteUri ?? '',
    fonte: 'places',
  }));
}

// OpenStreetMap/Nominatim — 100% grátis, sem chave, sem cadastro, sem
// cartão. Fonte padrão quando nenhuma chave paga tá configurada. Cobertura
// de comércio local no Brasil é menor que Google/TomTom (depende de
// contribuição voluntária), mas destrava o uso sem custo nenhum.
async function buscarOSM(nicho, cidade) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', `${nicho}, ${cidade}`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '50');
  url.searchParams.set('countrycodes', 'br');

  const resposta = await fetch(url, {
    headers: { 'User-Agent': 'genesis-prospeccao/0.1 (uso interno Missões Tech)' },
  });
  if (!resposta.ok) throw new Error(`OSM ${resposta.status}: ${await resposta.text()}`);
  const dado = await resposta.json();

  // Nominatim não devolve telefone — só localização/nome. Serve pra
  // descoberta (existe? onde fica?), não substitui enriquecimento de
  // contato (isso fica pro cnpj.js quando o CNPJ for conhecido).
  return dado.map((r) => ({
    nome: r.display_name.split(',')[0],
    telefone: '',
    categoria: r.type || nicho,
    cidade,
    site: '',
    fonte: 'osm',
  }));
}

// Prioridade: Apify (mais rico, pago) > TomTom (grátis, oficial, tem
// telefone) > navegador (grátis, sem chave, mas frágil — DOM pode
// quebrar, Google pode bloquear em uso pesado; exige opt-in explícito
// por env var, não é padrão silencioso) > Google Places (grátis com
// billing) > OSM (grátis, sem telefone — último recurso).
export async function buscarEmpresas(nicho, cidade) {
  if (APIFY_TOKEN) return buscarApify(nicho, cidade);
  if (TOMTOM_KEY) return buscarTomTom(nicho, cidade);
  if (process.env.USAR_NAVEGADOR === '1') {
    const { buscarGoogleMapsBrowser } = await import('./maps-browser.js');
    return buscarGoogleMapsBrowser(nicho, cidade);
  }
  if (GOOGLE_KEY) return buscarGooglePlaces(nicho, cidade);
  return buscarOSM(nicho, cidade);
}

// CLI: node coleta/src/maps.js "clínica odontológica" "Serra, ES"
if (import.meta.url === `file://${process.argv[1]}`) {
  const [nicho, cidade] = process.argv.slice(2);
  if (!nicho || !cidade) {
    console.error('uso: node coleta/src/maps.js "<nicho>" "<cidade>"');
    process.exit(1);
  }
  buscarEmpresas(nicho, cidade)
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => console.error('[maps] erro:', e.message));
}
