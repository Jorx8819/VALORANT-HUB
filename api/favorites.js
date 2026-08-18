import { supabase } from '../supabaseClient.js';

export default async function handler(req, res) {
  // Solo permitimos peticiones POST (para guardar) o GET (para consultar)
  const { method } = req;

  if (method === 'GET') {
    // Obtener los favoritos de un usuario
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Falta el parámetro userId' });
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ favorites: data });
  } 
  
  else if (method === 'POST') {
    // Guardar un nuevo favorito
    const { userId, itemUuid, itemType } = req.body;

    if (!userId || !itemUuid || !itemType) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (userId, itemUuid, itemType)' });
    }

    const { data, error } = await supabase
      .from('favorites')
      .insert([{ user_id: userId, item_uuid: itemUuid, item_type: itemType }]);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ message: 'Favorito guardado con éxito', data });
  } 
  
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
