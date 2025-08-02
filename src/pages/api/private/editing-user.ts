// pages/api/addingteam.ts
import { verifyToken } from "@/lib/jwt";
import { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";
import fs from "fs";
import path from "path";
import { decript, encript } from "@/lib/main";
import bcrypt from "bcrypt";

function readDecryptedUsers(path: string, key: string) {
	const fileUSRContain = fs.readFileSync(path, "utf-8");
	const decrypted = decript(fileUSRContain, key);
	return JSON.parse(Buffer.from(decrypted, "base64").toString("utf-8"));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") return res.status(405).end();

	const cookies = cookie.parse(req.headers.cookie || "");
	const token = cookies.auth_token;
	const payload = verifyToken(token || "");
	if (!payload) {
		return res.status(403).json({ message: "Нет доступа" });
	}

	const { login, action, password, usrRole } = req.body as { login: string, action: "edit-role" | "edit-password" | null, password: string, usrRole: string };
	if (action == null) {
		return res.status(502).json({ message: "Действие не заданно", error: null });
	}
	try {
		if (action === "edit-role") {
			if (!login || !usrRole) {
				return res.status(400).json({ message: "Неправильно введены логин или роль", error: null });
			}
			const users: { login: string, role: string }[] = readDecryptedUsers(path.join(process.cwd(), 'data/users.enc'), process.env.KEY as string);

			const user = users.find(u => u.login === login);
			if (!user) {
				return res.status(404).json({ message: "Пользователь не найден" });
			}

			const userIndex = users.findIndex(u => u.login === login);

			users[userIndex].role = usrRole;

			const base64String = Buffer.from(JSON.stringify(users, null, 2)).toString('base64')
			const newFile = encript(base64String, process.env.KEY as string);
			if (typeof newFile == "string")
				fs.writeFileSync(path.join(process.cwd(), "data/users.enc"), newFile);
			return res.status(200).json({ message: "Роль успешно изменена", success: true, logout: false });
		} else if (action === "edit-password") {
			if (!login || !password) {
				return res.status(400).json({ message: "Неправильно введены логин или пароль", error: null });
			}
			const USERSJSON: { login: string, hash: string, role: string }[] = readDecryptedUsers(path.join(process.cwd(), "data/users.enc"), process.env.KEY as string);
			if (!USERSJSON) return res.status(502).json({ message: "Файл с пользователями не был прочитан", error: null });

			const userIndex = USERSJSON.findIndex((u) => u.login === login);
			if (userIndex === -1) return res.status(404).json({ message: "Пользователь не найден", error: null });

			const hash = await bcrypt.hash(password, 10);
			USERSJSON[userIndex].hash = hash;

			const base64String = Buffer.from(JSON.stringify(USERSJSON, null, 2)).toString('base64');
			const newFile = encript(base64String, process.env.KEY as string);
			if (typeof newFile == "string")
				fs.writeFileSync(path.join(process.cwd(), "data/users.enc"), newFile);
			return res.status(200).json({ message: "Пароль успешно изменён", success: true, logout: true });
		}

		
	} catch (err) {
		res.status(500).json({ message: "Ошибка, попробуйте позже", error: err });
	}
}
