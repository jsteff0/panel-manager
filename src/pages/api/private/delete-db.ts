// pages/api/delete-team.ts
// Пример как работать с командой DELETE в SQL 
import { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";
import { verifyToken } from "@/lib/jwt";
import pool from "@/lib/db";
import { isActionAllowed } from "@/lib/permissions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).end();

  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.auth_token;
  const payload = verifyToken(token || "");
  const fileName = (req.url || "").split("?")[0].split("/").filter(Boolean).pop() || "";
  if (!payload || !isActionAllowed(payload.role, fileName)) {
    return res.status(403).json({ message: "Нет доступа" });
  }

  const { teamName } = req.body as { teamName?: string };
  if (!teamName) {
    return res.status(400).json({ message: "teamName не найден", error: null });
  }

  try {
    const result = await pool.query(
      `DELETE FROM teams WHERE teamname = $1 RETURNING teamname`,
      [teamName]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Команда не найдена", error: null });
    }
    return res.status(200).json({ success: true, deleted: result.rows[0].teamname });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Ошибка базы данных", error: err });
  }
}
