import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { hasPermission, isAppRole, type AppRole, type Permission } from "../security/authorization";

export interface AuthedRequest extends Request {
  user?: { username: string; displayName: string; displayRole: string; role: AppRole };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "لازم است وارد شوید" });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret, { issuer: "mindway-demo", audience: "mindway-ui" }) as jwt.JwtPayload;
    req.user = {
      username: payload.sub as string,
      displayName: payload.displayName,
      displayRole: payload.displayRole,
      role: isAppRole(payload.role) ? payload.role : "viewer",
    };
    next();
  } catch {
    res.status(401).json({ error: "توکن نامعتبر یا منقضی‌شده" });
  }
}

export function requirePermission(permission: Permission) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "لازم است وارد شوید" });
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: "برای انجام این عملیات دسترسی کافی ندارید" });
    }
    next();
  };
}
