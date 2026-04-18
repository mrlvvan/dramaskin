import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.js";
import { badRequest, notFound } from "../utils/httpError.js";

export const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) throw notFound("Пользователь не найден");
    res.json(user);
  }),
);

userRouter.patch(
  "/me",
  asyncHandler(async (req, res) => {
    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
    } = req.body || {};

    if (phone !== undefined || dateOfBirth !== undefined) {
      throw badRequest("Телефон и дату рождения можно изменить только через поддержку");
    }

    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
      },
    });

    res.json(updated);
  }),
);
