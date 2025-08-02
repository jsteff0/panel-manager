//Пример работы как сгенерировать файл на основе другого файла(data/template.yml) с данными из БД
import { NextApiRequest, NextApiResponse } from "next";
import { verifyToken } from "@/lib/jwt";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import os from "os";
import cookie from "cookie";
import { isActionAllowed } from "@/lib/permissions";

const TEMPLATE_PATH = path.join(process.cwd(), "data", "031b4699-6c43-4b3f-aa8d-1c9a928f5e40.yml");

interface Team {
  teamname: string;
  uuid: string[];
  nicknames: string[];
}

const TEMPLATE_ENTRIES = [
  { bed: "71.0;21.0;24.0;0.0;0.0", spawn: "86.0;21.0;24.0;90.0;0.0", color: "BLUE" },
  { bed: "24.0;21.0;71.0;0.0;0.0", spawn: "24.0;21.0;86.0;180.0;0.0", color: "GREEN" },
  { bed: "-26.0;21.0;71.0;0.0;0.0", spawn: "-25.0;21.0;86.0;180.0;0.0", color: "YELLOW" },
  { bed: "-73.0;21.0;24.0;0.0;0.0", spawn: "-87.0;21.0;24.0;270.0;0.0", color: "CYAN" },
  { bed: "-73.0;21.0;-26.0;0.0;0.0", spawn: "-87.0;21.0;-25.0;270.0;0.0", color: "WHITE" },
  { bed: "-26.0;21.0;-73.0;0.0;0.0", spawn: "-25.0;21.0;-88.0;0.0;0.0", color: "PINK" },
  { bed: "24.0;21.0;-73.0;0.0;0.0", spawn: "24.0;21.0;-87.0;0.0;0.0", color: "GRAY" },
  { bed: "71.0;21.0;-26.0;0.0;0.0", spawn: "86.0;21.0;-26.0;0.0;0.0", color: "RED" },
];
const TEMPLATE_NAME = "template.yml";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.auth_token;
  const payload = verifyToken(token || "");
  const fileName = (req.url || "").split("?")[0].split("/").filter(Boolean).pop() || "";
  if (!payload || !isActionAllowed(payload.role, fileName)) {
    return res.status(403).json({ message: "Нет доступа" });
  }
  
  const { teams } = req.body as { teams: Team[] };
  if (!Array.isArray(teams) || teams.length === 0) {
    return res.status(400).json({ message: "Нужен список команд", error: null });
  }

  const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bw-"));
  const chunked = chunkArray(teams, 8);

  chunked.forEach((chunk, index) => {
    const teamYaml = chunk.map((team, i) => {
      return `  ${team.teamname}:\n` +
        `    isNewColor: true\n` +
        `    color: ${TEMPLATE_ENTRIES[i].color}\n` +
        `    maxPlayers: 2\n` +
        `    bed: ${TEMPLATE_ENTRIES[i].bed}\n` +
        `    spawn: ${TEMPLATE_ENTRIES[i].spawn}\n` +
        `    actualName: ${team.teamname}`;
    }).join("\n");

    const fullYaml = template.replace(/teams:\s*\n/, `teams:\n${teamYaml}\n`);

    const folder = path.join(tmpDir, `cfg${index + 1}`);
    fs.mkdirSync(folder);

    // 🟡 Создаём локальный whitelist только для этого чанка
    const chunkWhitelist: { uuid: string; name: string }[] = [];
    chunk.forEach((team) => {
      team.uuid.forEach((uuid, idx) => {
        chunkWhitelist.push({ uuid, name: team.nicknames[idx] });
      });
    });

    fs.writeFileSync(path.join(folder, TEMPLATE_NAME), fullYaml);
    fs.writeFileSync(path.join(folder, "whitelist.json"), JSON.stringify(chunkWhitelist, null, 2));
  });


  // Архивируем
  const zipPath = path.join(tmpDir, "configs.zip");
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(output);
  fs.readdirSync(tmpDir).forEach((file) => {
    const fullPath = path.join(tmpDir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      archive.directory(fullPath, file);
    } else {
      archive.file(fullPath, { name: file });
    }
  });

  await archive.finalize();

  output.on("close", () => {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=configs.zip");
    const zipBuffer = fs.readFileSync(zipPath);
    res.send(zipBuffer);
  });
}


function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
