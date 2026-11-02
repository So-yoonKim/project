import { searchPlaces } from '../server/places.js';

// /api/places?cat=sea|oreum|indoor|coffee|meal&keyword=...&rows=12
export default async function handler(req, res) {
  try {
    const { cat, keyword = '', rows = '12' } = req.query;
    res.status(200).json(await searchPlaces({ category: cat, keyword, rows: Number(rows) || 12 }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
