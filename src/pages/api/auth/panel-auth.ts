import type { NextApiRequest, NextApiResponse } from "next";
import { createToken, setTokenCookie } from "@/lib/jwt";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { decript } from "@/lib/main";

const ipwlPath = path.join(process.cwd(), "data/ipwhitelist.json");
const IP_WHITELIST = JSON.parse(fs.readFileSync(ipwlPath, "utf-8"));

interface User {
  login: string;
  hash: string;
  role: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "";

  if (req.method !== "POST") return res.status(405).end();

  const { login, password } = req.body;
  let USERS: User[] | null = null;
  const key = process.env.KEY;
  const encPath = path.join(process.cwd(), "data/users.enc");
  const encContain = fs.readFileSync(encPath, "utf-8")
  if (encContain && key) {
    console.log(ip, login, password)
    const usersfile = decript(encContain, key);
    const buf = Buffer.from(usersfile, 'base64')
    USERS = JSON.parse(buf.toString('utf-8'));
  }
  if (USERS == null) return res.json({ success: false });
  const user = USERS.find((u) => u.login === login);
  const passwordCorrect = user && await bcrypt.compare(password, user.hash);

  if (!passwordCorrect) return res.json({ success: false });

  const ipIsAllowed = IP_WHITELIST.includes(ip);
  if (ipIsAllowed) {
    const token = createToken({ login: login, role: user.role });
    console.log(user.role)
    setTokenCookie(res, token);
    console.log(token)
    return res.json({ success: true });
  }

  res.json({ success: false });
}
