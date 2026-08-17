import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Inicializar Redis con las variables de entorno de Netlify
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Configurar Rate Limit: Permitir máximo 10 peticiones por cada 1 minuto por IP
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
});

export default async function handler(req, res) {
  // 1. Obtener la IP del usuario para el control de seguridad (Rate Limit)
  const identifier = req.headers['x-forwarded-for'] || '127.0.0.1';
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

  // Si supera el límite, devolvemos error 429
  if (!success) {
    return res.status(429).json({
      error: 'Demasiadas peticiones. Por favor, espera un minuto antes de volver a buscar.',
      limit,
      remaining,
      reset
    });
  }

  // 2. Obtener el nombre y etiqueta del jugador desde la URL de la petición
  const { name, tag } = req.query;

  if (!name || !tag) {
    return res.status(400).json({ error: 'Faltan los parámetros "name" o "tag"' });
  }

  const cacheKey = `player:${name.toLowerCase()}:${tag.toLowerCase()}`;

  try {
    // 3. Comprobar si los datos ya están guardados en la caché de Upstash
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      // Si existe, lo devolvemos al instante sin gastar peticiones a la API oficial
      return res.status(200).json({ source: 'cache', data: cachedData });
    }

    // 4. Si no está en caché, consultamos la API oficial de HenrikDev usando tu API Key secreta
    const apiKey = process.env.HENRIK_API_KEY;
    const response = await fetch(`https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, {
      headers: {
        'Authorization': apiKey
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // 5. Guardar el resultado en Upstash Redis con caducidad de 900 segundos (15 minutos)
    await redis.set(cacheKey, data, { ex: 900 });

    // Devolver los datos al cliente
    return res.status(200).json({ source: 'api', data });

  } catch (error) {
    console.error('Error en el proxy serverless:', error);
    return res.status(500).json({ error: 'Error interno del servidor proxy' });
  }
}
