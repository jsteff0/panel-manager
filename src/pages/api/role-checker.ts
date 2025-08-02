// pages/api/addingteam.ts
import { verifyToken } from "@/lib/jwt";
import { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";
import fs from "fs";
import path from "path";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") return res.status(405).end();

	const cookies = cookie.parse(req.headers.cookie || "");
	const token = cookies.auth_token;
	const payload = verifyToken(token || "");
	if (!payload) {
		return res.status(403).json({ message: "Нет доступа" });
	}

	const { roleName } = req.body as { roleName: string };
	if (!roleName) {
		return res.status(400).json({ message: "Неправильно введен логин", error: null });
	}
	const filePath = path.join(process.cwd(), 'data/roles.json');
	const encrypted = fs.readFileSync(filePath, 'utf-8');
	const rolesObj = JSON.parse(encrypted);
	const roleNames = Object.keys(rolesObj);

	const exists = roleNames.includes(roleName);
	res.status(200).json({ exists });
}
