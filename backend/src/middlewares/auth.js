import { verifyAccessToken } from "../utils/jwt.js";
import { unauthorized } from "../utils/httpError.js";

export function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw unauthorized("Отсутствует токен авторизации (Bearer)");
  }

  const decoded = verifyAccessToken(token);
  req.user = {
    userId: Number(decoded.userId),
    role: decoded.role,
  };

  next();
}
