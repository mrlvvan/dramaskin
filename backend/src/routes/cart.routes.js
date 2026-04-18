import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.js";
import { badRequest, notFound } from "../utils/httpError.js";

export const cartRouter = Router();

cartRouter.use(authMiddleware);

cartRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user.userId },
      include: { product: { include: { category: true } } },
      orderBy: { updatedAt: "desc" },
    });
    res.json(items);
  }),
);

cartRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const productId = Number(req.body.productId);
    const quantity = Number(req.body.quantity || 1);

    if (!productId || quantity < 1) {
      throw badRequest("Укажите productId и quantity");
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isPublished) throw notFound("Товар не найден");

    const existing = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId: req.user.userId, productId } },
    });

    const targetQuantity = (existing?.quantity || 0) + quantity;
    if (targetQuantity > product.stock) {
      throw badRequest("Нельзя добавить больше, чем есть на складе");
    }

    const item = await prisma.cartItem.upsert({
      where: { userId_productId: { userId: req.user.userId, productId } },
      create: {
        userId: req.user.userId,
        productId,
        quantity,
      },
      update: {
        quantity: targetQuantity,
      },
      include: { product: { include: { category: true } } },
    });

    res.status(201).json(item);
  }),
);

cartRouter.patch(
  "/:productId",
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.productId);
    const quantity = Number(req.body.quantity);

    if (!productId || quantity < 1) {
      throw badRequest("Укажите корректные productId и quantity");
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw notFound("Товар не найден");
    if (quantity > product.stock) {
      throw badRequest("Количество не может превышать остаток на складе");
    }

    const updated = await prisma.cartItem.update({
      where: { userId_productId: { userId: req.user.userId, productId } },
      data: { quantity },
      include: { product: { include: { category: true } } },
    });

    res.json(updated);
  }),
);

cartRouter.delete(
  "/:productId",
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.productId);

    await prisma.cartItem.deleteMany({
      where: { userId: req.user.userId, productId },
    });

    res.status(204).send();
  }),
);
