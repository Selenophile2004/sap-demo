import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface AuthedRequest extends Request {
  user?: { username: string; displayName: string; displayRole: string };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "لازم است وارد شوید" });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    req.user = {
      username: payload.sub as string,
      displayName: payload.displayName,
      displayRole: payload.displayRole,
    };
    next();
  } catch {
    res.status(401).json({ error: "توکن نامعتبر یا منقضی‌شده" });
  }
}
