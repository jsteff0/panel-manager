// Пример как работать с командой UPDATE в SQL 
import { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";
import { verifyToken } from "@/lib/jwt";
import pool from "@/lib/db";
import { isActionAllowed } from "@/lib/permissions";

type Body = {
  by: "team" | "nick";        // ищем по названию команды или по нику
  value: string;              // сама строка: teamName или nickname
  delta: number;              // положительное — прибавить, отрицательное — вычесть
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // Проверяем JWT из cookie
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.auth_token;
  const payload = verifyToken(token || "");
  const fileName = (req.url || "").split("?")[0].split("/").filter(Boolean).pop() || "";
  if (!payload || !isActionAllowed(payload.role, fileName)) {
    return res.status(403).json({ message: "Нет доступа" });
  }

  const { by, value, delta } = req.body as Body;
  if (!by || !value || typeof delta !== "number") {
    return res.status(400).json({ message: "Неправильно введены " + (!by ? "тип поиска" : "") + (!value ? "ник или название команды" : "") + (typeof delta !== "number" ? "очки" : ""), error: null });
  }

  // 3. Собираем SQL
  // если ищем по нику — проверяем, что value содержится в массиве nicknames
  const whereClause =
    by === "team"
      ? `teamname = $2`
      : `$2 = ANY(nicknames)`;

  try {
    const result = await pool.query(
      `
      UPDATE teams
         SET points = points + $1
       WHERE ${whereClause}
     RETURNING teamname, points
      `,
      [delta, value]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Команда не найдена", error: null });
    }

    // 4. Отдаем обновлённые данные
    return res.status(200).json({ success: true, team: result.rows[0] });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ message: `Ошибка базы данных`, error: err });
  }
}
