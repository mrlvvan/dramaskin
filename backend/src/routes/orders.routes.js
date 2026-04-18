import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.js";
import { badRequest } from "../utils/httpError.js";

export const ordersRouter = Router();

ordersRouter.use(authMiddleware);

ordersRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.userId },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(orders);
  }),
);

ordersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      fullName,
      email,
      phone,
      city,
      addressLine,
      comment,
      promoCode,
      apartment,
      entrance,
      intercom,
      floor,
    } = req.body || {};
    if (!fullName || !email || !phone || !city || !addressLine) {
      throw badRequest("Обязательны поля: ФИО, email, телефон, город, адрес (улица и дом)");
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user.userId },
      include: { product: true },
    });

    if (!cartItems.length) {
      throw badRequest("Корзина пуста");
    }

    for (const item of cartItems) {
      if (item.quantity > item.product.stock) {
        throw badRequest(
          `Недостаточно остатка для «${item.product.name}». Доступно: ${item.product.stock} шт.`,
        );
      }
    }

    const totalAmount = cartItems.reduce(
      (acc, item) => acc + Number(item.product.price) * item.quantity,
      0,
    );

    const order = await prisma.$transaction(async (tx) => {
      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      const createdOrder = await tx.order.create({
        data: {
          userId: req.user.userId,
          fullName: String(fullName).trim(),
          email: String(email).trim(),
          phone: String(phone).trim(),
          city: String(city).trim(),
          addressLine: String(addressLine).trim(),
          comment: comment ? String(comment).trim() : null,
          promoCode: promoCode ? String(promoCode).trim() : null,
          apartment: apartment ? String(apartment).trim() : null,
          entrance: entrance ? String(entrance).trim() : null,
          intercom: intercom ? String(intercom).trim() : null,
          floor: floor ? String(floor).trim() : null,
          totalAmount,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.product.price,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
        },
      });

      await tx.cartItem.deleteMany({
        where: { userId: req.user.userId },
      });

      return createdOrder;
    });

    res.status(201).json(order);
  }),
);
