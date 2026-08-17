// api/player.js
export default async function handler(req, res) {
  // Manejo de CORS para permitir solicitudes desde tu propio frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Se obtiene la API key de las variables de entorno de Vercel/Netlify
  const HENRIK_API_KEY = process.env.HENRIK_API_KEY;
  const { type, name, tag, region, puuid } = req.query;

  let externalUrl = '';

  // Determinar la ruta adecuada según el tipo de consulta
  if (type === 'account') {
    externalUrl = `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  } else if (type === 'mmr') {
    externalUrl = `https://api.henrikdev.xyz/valorant/v2/by-puuid/mmr/${region}/${puuid}`;
  } else if (type === 'matches') {
    externalUrl = `https://api.henrikdev.xyz/valorant/v3/by-puuid/matches/${region}/${puuid}?size=5`;
  } else {
    return res.status(400).json({ error: 'Tipo de petición no válido.' });
  }

  try {
    const response = await fetch(externalUrl, {
      headers: {
        'Authorization': HENRIK_API_KEY,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    // Caching HTTP de 15 minutos (900 seg) en CDN para optimizar las peticiones repetidas
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=60');
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error interno en el Proxy de Valorant' });
  }
}