// pages/api/addingteam.ts
// Пример как работать с командой INSERT в SQL 
import { verifyToken } from "@/lib/jwt";
import pool from '@/lib/db';
import { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";
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
	
	const { teamName, participant1, participant2 } = req.body;
	if (!teamName || !participant1 || !participant2) {
		return res.status(400).json({ message: "Неправильно введены " + (!teamName ? "название команды" : "") + (!participant1 ? "первый игрок" : "") + (!participant2 ? "второй игрок" : ""), error: null });
	}
	const getUUID = async (playerName: string) => {
		const resUUID = await fetch(`https://api.mojang.com/users/profiles/minecraft/${playerName}`);
		if (!resUUID.ok) res.status(404).json({ error: `${playerName} не найден` });
		const data = await resUUID.json();
		const uuidPl1 = data.id;
		console.log(data)
		console.log("UUID:", uuidPl1);
		return uuidPl1;
	};

	const uuidPl1 = await getUUID(participant1);
	const uuidPl2 = await getUUID(participant2);
	console.log(JSON.stringify([participant1, participant2]))
	try {
		await pool.query(
			'INSERT INTO teams (teamname, nicknames, uuid) VALUES ($1, $2, $3)',
			[
				teamName,
				[participant1, participant2],
				[uuidPl1, uuidPl2],
			]
		);

		res.status(200).json({ success: true });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: `Ошибка базы данных`, error: err });
	}
}
