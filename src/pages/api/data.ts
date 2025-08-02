// Файл: pages/api/data.ts
import pool from '@/lib/db';
import { NextApiRequest, NextApiResponse } from 'next';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM teams');
      res.status(200).json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Ошибка запроса к БД' });
    }
  } else {
    res.status(405).end(); // Method Not Allowed
  }
}
