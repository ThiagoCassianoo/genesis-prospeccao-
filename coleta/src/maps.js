// Descoberta de empresa local por nicho+região — o papel que seria do
// "Google Maps scraping". Duas fontes, mesma saída normalizada; escolhe
// pela env var disponível. Nenhuma delas passa pelo MCP (MCP só existe
// dentro de uma sessão do Claude) — chamada HTTP direta, roda sozinho
// via cron/CLI, sem depender de conversa aberta.

const TOMTOM_KEY = process.env.TOMTOM_API_KEY;
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;

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

export async function buscarEmpresas(nicho, cidade) {
  if (TOMTOM_KEY) return buscarTomTom(nicho, cidade);
  if (GOOGLE_KEY) return buscarGooglePlaces(nicho, cidade);
  throw new Error(
    'nenhuma chave configurada. Defina TOMTOM_API_KEY ou GOOGLE_MAPS_API_KEY no .env (ver README.md).'
  );
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
