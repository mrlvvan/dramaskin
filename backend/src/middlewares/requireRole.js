import { prisma } from "../config/prisma.js";
import { forbidden } from "../utils/httpError.js";

/**
 * Роль берём из БД, а не из JWT: иначе после смены роли (USER → ADMIN) старый access-токен
 * даёт 403, хотя GET /me уже отдаёт ADMIN и фронт показывает админку.
 */
export function requireRole(...roles) {
  return async (req, _res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        next(forbidden("Недостаточно прав"));
        return;
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (!user || !roles.includes(user.role)) {
        next(forbidden("Недостаточно прав"));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
