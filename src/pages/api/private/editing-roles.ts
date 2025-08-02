
import { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import cookie from "cookie";
import { verifyToken } from "@/lib/jwt";
import { isActionAllowed } from "@/lib/permissions";
import { writeFile } from 'fs/promises';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

		const cookies = cookie.parse(req.headers.cookie || "");
	const token = cookies.auth_token;
	const payload = verifyToken(token || "");
	const fileName = (req.url || "").split("?")[0].split("/").filter(Boolean).pop() || "";
	if (!payload || !isActionAllowed(payload.role, fileName)) {
		return res.status(403).json({ message: "Нет доступа" });
	}

  try {
    const roles = req.body;
    const filePath = path.join(process.cwd(), 'data', 'roles.json');
    await writeFile(filePath, JSON.stringify(roles, null, 2));
    res.status(200).json({ message: "Настройки ролей изменены", success: true, updated: roles });
  } catch (err) {
	console.log(err)
    res.status(500).json({ message: "Ошибка, не удалось обновить настройки ролей", error: err });
  }
}
