// lib/jwt.ts
import jwt from "jsonwebtoken";
import { serialize, parse } from "cookie";
import { NextApiRequest, NextApiResponse } from 'next';

export function createToken(payload: { login: string; role: string }) {
	const secret = process.env.JWT_SECRET!;
	return jwt.sign(payload, secret, { expiresIn: "2h" });
}

export function verifyToken(token: string): { login: string; role: string } | null {
	try {
		const secret = process.env.JWT_SECRET!;
		return jwt.verify(token, secret) as { login: string; role: string };
	} catch {
		return null;
	}
}

export function setTokenCookie(res: NextApiResponse, token: string) {
  const cookie = serialize("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
  res.setHeader("Set-Cookie", cookie);
}

export function getTokenFromReq(req: NextApiRequest): string | null {
  const cookies = parse(req.headers.cookie || "");
  return cookies.auth_token || null;
}

export function clearToken(res: NextApiResponse) {
  const cookie = serialize("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  res.setHeader("Set-Cookie", cookie);
}
