// Busca determinística do Google Meu Negócio via Google Places API (New).
// Substitui o web_search da IA pra dados de GMB (nota + nº de avaliações),
// que era impreciso (dizia "não tem Google" para leads que tinham ficha).
// Free tier: 10.000 chamadas/mês. Volume REC <200/mês = grátis.

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';

// Retorna { tem_ficha, nota, num_avaliacoes, nome, endereco, maps_uri } ou
// { tem_ficha:null } quando a chave não existe / erro / nada encontrado.
export async function buscarGMB(nomeEmpresa, cidade) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || !nomeEmpresa) return { tem_ficha: null };

  const textQuery = [nomeEmpresa, cidade].filter(Boolean).join(' ');
  try {
    const r = await fetch(PLACES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.googleMapsUri',
      },
      body: JSON.stringify({ textQuery, languageCode: 'pt-BR', regionCode: 'BR' }),
    });
    if (!r.ok) {
      console.warn('[_places] HTTP', r.status, (await r.text()).slice(0, 200));
      return { tem_ficha: null };
    }
    const data = await r.json();
    const p = (data.places || [])[0];
    if (!p) return { tem_ficha: false }; // resposta válida, mas sem ficha = ausência confirmada
    return {
      tem_ficha: true,
      nota: p.rating ?? null,
      num_avaliacoes: p.userRatingCount ?? null,
      nome: p.displayName?.text || null,
      endereco: p.formattedAddress || null,
      maps_uri: p.googleMapsUri || null,
    };
  } catch (e) {
    console.warn('[_places] erro:', e.message);
    return { tem_ficha: null };
  }
}
