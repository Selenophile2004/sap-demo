import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { config } from "../config";

export const authRouter = Router();

// چون سایت پابلیک می‌شود، بدون این، لاگین در برابر brute-force محافظتی ندارد.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "تعداد تلاش‌های ورود بیش از حد مجاز است؛ چند دقیقه دیگر دوباره امتحان کنید." },
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "نام کاربری و رمز عبور الزامی است" });
  }

  const user = config.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  // Always run bcrypt.compare even on unknown username to avoid a timing
  // side-channel that reveals whether a username exists.
  const hashToCheck = user?.passwordHash ?? "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
  const isValid = await bcrypt.compare(password, hashToCheck);

  if (!user || !isValid) {
    return res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است" });
  }

  const token = jwt.sign(
    { sub: user.username, displayName: user.displayName, displayRole: user.displayRole },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
  );

  res.json({
    token,
    user: {
      username: user.username,
      displayName: user.displayName,
      displayRole: user.displayRole,
    },
  });
});

authRouter.get("/me", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "توکن ارسال نشده" });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    res.json({
      username: payload.sub,
      displayName: payload.displayName,
      displayRole: payload.displayRole,
    });
  } catch {
    res.status(401).json({ error: "توکن نامعتبر یا منقضی‌شده" });
  }
});
