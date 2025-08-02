// pages/api/addingteam.ts
import { verifyToken } from "@/lib/jwt";
import { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";
import fs from "fs";
import path from "path";
import { decript } from "@/lib/main";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") return res.status(405).end();

	const cookies = cookie.parse(req.headers.cookie || "");
	const token = cookies.auth_token;
	const payload = verifyToken(token || "");
	if (!payload) {
		return res.status(403).json({ message: "Нет доступа" });
	}

	const { login } = req.body as { login: string };
	if (!login) {
		return res.status(400).json({ message: "Неправильно введен логин", error: null });
	}
	const filePath = path.join(process.cwd(), 'data/users.enc');
	const encrypted = fs.readFileSync(filePath, 'utf-8');
	const decrypted = Buffer.from(decript(encrypted, process.env.KEY!), 'base64').toString('utf-8');
	const users: { login: string, role: string }[] = JSON.parse(decrypted);

	const exists = users.some((u: { login: string }) => u.login === login);

	const role = users.find((u: { login: string }) => u.login === login)?.role || null;

	const rolesPath = path.join(process.cwd(), 'data/roles.json');
	const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf-8'));

	const getRoleWeight = (role: string) => rolesData[role]?.length || 0;

	const currentUserRole = payload.role;
	const targetUserRole = users.find((u) => u.login === login)?.role || null;

	const allowed = targetUserRole
		? getRoleWeight(currentUserRole) > getRoleWeight(targetUserRole)
		: false;

	res.status(200).json({ exists, role, allowed });
}
