// pages/api/addingteam.ts
import { verifyToken } from "@/lib/jwt";
import { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { decript, encript } from "@/lib/main";
import { isActionAllowed } from "@/lib/permissions";


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
	const fileName = (req.url || "").split("?")[0].split("/").filter(Boolean).pop() || "";
	if (!payload || !isActionAllowed(payload.role, fileName)) {
		return res.status(403).json({ message: "Нет доступа" });
	}

	const { login, password, ipStr, action, usrRole } = req.body as { login: string, password: string, ipStr: string, action: "user" | "IP" | "delete" | "edit-password" | null, usrRole: string };
	if (action == null) {
		return res.status(502).json({ message: "Действие не заданно", error: null });
	}
	const ip = ipStr.split(",")
	if ((action == "user" && (!login || !password || !Array.isArray(ip) || ip.length === 0 || !usrRole)) || (action == "IP" && !Array.isArray(ip) || ip.length === 0) || (action == "delete" && !login)) {
		return res.status(400).json({ message: "Неправильно введены " + (!login ? "логин " : "") + (!password ? "пароль " : "") + (!Array.isArray(ip) ? "айпи" : ""), error: null });
	}
	try {
		if (action == "user") {
			const hash = await bcrypt.hash(password, 10);
			const USERSJSON: { login: string, hash: string, role: string }[] = readDecryptedUsers(path.join(process.cwd(), "data/users.enc"), process.env.KEY as string);
			if (USERSJSON) {
				if (USERSJSON.find((u) => u.login === login) != null) {
					return res.status(406).json({ message: "Логин уже занят", error: null });
				}
				USERSJSON.push({ login, hash, role: usrRole });
				const base64String = Buffer.from(JSON.stringify(USERSJSON, null, 2)).toString('base64')
				const newFile = encript(base64String, process.env.KEY as string);
				if (typeof newFile == "string")
					fs.writeFileSync(path.join(process.cwd(), "data/users.enc"), newFile);
			} else return res.status(502).json({ message: "Файл с пользователями не был прочитан", error: null });
		}
		if (action == "user" || action == "IP") {
			const fileIPPath = path.join(process.cwd(), "data/ipwhitelist.json");
			const fileIPContain = fs.readFileSync(fileIPPath, "utf-8")
			let IPJSON = null;
			if (fileIPContain) {
				IPJSON = JSON.parse(fileIPContain) as string[]
				for (let i = 0; i < ip.length; i++) {
					if (!IPJSON.includes(ip[i])) IPJSON.push(ip[i]);
				}
				const newFile = JSON.stringify(IPJSON);
				if (typeof newFile == "string")
					fs.writeFileSync(fileIPPath, newFile);
			}
			if (action == "IP") {
				res.status(200).json({ message: "IP добавлен в whitelist", success: true });
			} if (action == "user") {
				res.status(200).json({ message: "Пользователь добавлен", success: true });
			}
		}
		if (action == "delete") {
			const USERSJSON: { login: string, hash: string }[] = readDecryptedUsers(path.join(process.cwd(), "data/users.enc"), process.env.KEY as string);
			if (USERSJSON) {
				const indexToRemoveById = USERSJSON.findIndex(item => item.login === login);
				if (indexToRemoveById !== -1) { // Ensure the element was found
					USERSJSON.splice(indexToRemoveById, 1);
				} else {
					return res.status(406).json({ message: "Логин не найден", error: null });
				}
				const base64String = Buffer.from(JSON.stringify(USERSJSON, null, 2)).toString('base64')
				const newFile = encript(base64String, process.env.KEY as string);
				if (typeof newFile == "string")
					fs.writeFileSync(path.join(process.cwd(), "data/users.enc"), newFile);
			}
			res.status(200).json({ message: "Пользователь удален", success: true });
		} else return res.status(502).json({ message: "Файл с пользователями не был прочитан", error: null });
	} catch (err) {
		res.status(500).json({ message: "Ошибка, попробуйте позже", error: err });
	}
}
