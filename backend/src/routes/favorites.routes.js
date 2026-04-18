import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.js";
import { badRequest, notFound } from "../utils/httpError.js";

export const favoritesRouter = Router();

favoritesRouter.use(authMiddleware);

favoritesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.userId },
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json(favorites);
  }),
);

favoritesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const productId = Number(req.body.productId);
    if (!productId) throw badRequest("Укажите корректный productId");

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isPublished) throw notFound("Товар не найден");

    const favorite = await prisma.favorite.upsert({
      where: {
        userId_productId: {
          userId: req.user.userId,
          productId,
        },
      },
      create: {
        userId: req.user.userId,
        productId,
      },
      update: {},
      include: { product: { include: { category: true } } },
    });

    res.status(201).json(favorite);
  }),
);

favoritesRouter.delete(
  "/:productId",
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.productId);
    await prisma.favorite.deleteMany({
      where: { userId: req.user.userId, productId },
    });
    res.status(204).send();
  }),
);
