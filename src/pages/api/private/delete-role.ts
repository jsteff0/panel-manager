import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import cookie from "cookie";
import { verifyToken } from "@/lib/jwt";
import { isActionAllowed } from "@/lib/permissions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") return res.status(405).end();

	const cookies = cookie.parse(req.headers.cookie || "");
	const token = cookies.auth_token;
	const payload = verifyToken(token || "");
	const fileName = (req.url || "").split("?")[0].split("/").filter(Boolean).pop() || "";
	if (!payload || !isActionAllowed(payload.role, fileName)) {
		return res.status(403).json({ message: "Нет доступа" });
	}

	const { deleteRole } = req.body;

	if (!deleteRole || typeof deleteRole !== "string") {
		res.status(400).json({ message: "Неправильно введенное название роли" });
		return;
	}

	const filePath = path.join(process.cwd(), "data", "roles.json");

	try {
		const fileData = fs.readFileSync(filePath, "utf-8");
		const roles = JSON.parse(fileData);

		if (!roles[deleteRole]) {
			return res.status(404).json({ message: "Такой роли не существует", success: false });
		}

		delete roles[deleteRole];

		fs.writeFileSync(filePath, JSON.stringify(roles, null, 2), "utf-8");

		res.status(200).json({ message: "Роль успешно удалена", success: true, updated: roles });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Ошибка, не удалось обновить роли", success: false, error: err });
	}
}