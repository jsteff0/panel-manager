import { clearToken } from "@/lib/jwt";
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  clearToken(res);
  res.json({ success: true });
}
