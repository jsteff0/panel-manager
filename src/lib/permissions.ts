import fs from "fs";
import path from "path";

export function isActionAllowed(role: string, action: string): boolean {
	try {
		const rolesPath = path.join(process.cwd(), "data/roles.json");
		const rolesRaw = fs.readFileSync(rolesPath, "utf-8");
		const roles = JSON.parse(rolesRaw) as Record<string, string[]>;
		return roles[role]?.includes(action) ?? false;
	} catch (err) {
		console.error("Ошибка при чтении ролей:", err);
		return false;
	}
}