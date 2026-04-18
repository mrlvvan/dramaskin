import { OrderStatus } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { uploadProductImage } from "../middlewares/uploadProductImage.js";
import { toJsonProduct, toJsonProductList } from "../utils/productJson.js";
import { badRequest, notFound } from "../utils/httpError.js";

export const adminRouter = Router();

adminRouter.use(authMiddleware, requireRole("ADMIN"));

adminRouter.post(
  "/upload-product-image",
  uploadProductImage.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file?.filename) {
      throw badRequest("Файл изображения не получен");
    }
    const url = `/uploads/products/${req.file.filename}`;
    res.json({ url });
  }),
);

adminRouter.get(
  "/products",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(toJsonProductList(products));
  }),
);

adminRouter.get(
  "/orders",
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      include: {
        user: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(orders);
  }),
);

adminRouter.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  }),
);

adminRouter.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) throw badRequest("Некорректный id пользователя");

    const {
      email,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      role,
    } = req.body || {};

    const updateData = {};

    if (email !== undefined) {
      const normalized = String(email).trim().toLowerCase();
      if (!normalized.includes("@")) throw badRequest("Укажите корректный email");
      updateData.email = normalized;
    }
    if (firstName !== undefined) updateData.firstName = String(firstName).trim();
    if (lastName !== undefined) updateData.lastName = String(lastName).trim();
    if (phone !== undefined) updateData.phone = String(phone).trim();
    if (dateOfBirth !== undefined) {
      if (!dateOfBirth) {
        updateData.dateOfBirth = null;
      } else {
        const parsed = new Date(String(dateOfBirth));
        if (Number.isNaN(parsed.getTime())) throw badRequest("Некорректная дата рождения");
        updateData.dateOfBirth = parsed;
      }
    }
    if (role !== undefined) {
      const nextRole = String(role);
      if (nextRole !== "USER" && nextRole !== "ADMIN") {
        throw badRequest("Роль должна быть USER или ADMIN");
      }
      updateData.role = nextRole;
    }

    if (!Object.keys(updateData).length) {
      throw badRequest("Укажите хотя бы одно поле для изменения");
    }

    let updated;
    try {
      updated = await prisma.user.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        if (error.code === "P2002") {
          throw badRequest("Пользователь с таким email уже существует");
        }
        if (error.code === "P2025") {
          throw notFound("Пользователь не найден");
        }
      }
      throw error;
    }

    res.json(updated);
  }),
);

adminRouter.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) throw badRequest("Некорректный id пользователя");

    if (id === req.user.userId) {
      throw badRequest("Нельзя удалить собственную учётную запись администратора");
    }

    try {
      await prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
        throw notFound("Пользователь не найден");
      }
      throw error;
    }

    res.status(204).send();
  }),
);

adminRouter.patch(
  "/orders/:id/status",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const status = String(req.body.status || "");

    if (!Object.values(OrderStatus).includes(status)) {
      throw badRequest(
        `Некорректный статус. Допустимые: ${Object.values(OrderStatus).join(", ")}`,
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
    });

    res.json(updated);
  }),
);

adminRouter.patch(
  "/orders/:id/cancel",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) throw badRequest("Некорректный id заказа");

    const updated = await prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });

    res.json(updated);
  }),
);

adminRouter.delete(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) throw badRequest("Некорректный id заказа");

    await prisma.order.delete({
      where: { id },
    });

    res.status(204).send();
  }),
);

function optionalTabLabel(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function mapProductInput(body = {}) {
  return {
    name: body.name ? String(body.name).trim() : undefined,
    slug: body.slug ? String(body.slug).trim() : undefined,
    subcategory: body.subcategory !== undefined ? String(body.subcategory).trim() : undefined,
    description: body.description !== undefined ? String(body.description) : undefined,
    usage: body.usage !== undefined ? String(body.usage) : undefined,
    manufacturer: body.manufacturer !== undefined ? String(body.manufacturer) : undefined,
    activeComponents:
      body.activeComponents !== undefined ? String(body.activeComponents) : undefined,
    weightGr: (() => {
      if (body.weightGr === undefined || body.weightGr === null || body.weightGr === "") {
        return undefined;
      }
      const n = Number(body.weightGr);
      if (!Number.isFinite(n)) return null;
      return Math.round(n);
    })(),
    country: body.country !== undefined ? String(body.country) : undefined,
    barcode: body.barcode !== undefined ? String(body.barcode) : undefined,
    characteristics:
      body.characteristics !== undefined ? String(body.characteristics) : undefined,
    composition: body.composition !== undefined ? String(body.composition) : undefined,
    tabLabelDescription:
      body.tabLabelDescription !== undefined ? optionalTabLabel(body.tabLabelDescription) : undefined,
    tabLabelCharacteristics:
      body.tabLabelCharacteristics !== undefined
        ? optionalTabLabel(body.tabLabelCharacteristics)
        : undefined,
    tabLabelComposition:
      body.tabLabelComposition !== undefined ? optionalTabLabel(body.tabLabelComposition) : undefined,
    price: body.price !== undefined ? Number(body.price) : undefined,
    stock: body.stock !== undefined ? Number(body.stock) : undefined,
    imageUrl: body.imageUrl !== undefined ? String(body.imageUrl) : undefined,
    isPublished: body.isPublished !== undefined ? Boolean(body.isPublished) : undefined,
    categoryId: body.categoryId !== undefined ? Number(body.categoryId) : undefined,
  };
}

adminRouter.post(
  "/products",
  asyncHandler(async (req, res) => {
    const data = mapProductInput(req.body);

    if (!data.name || !data.slug || !data.categoryId) {
      throw badRequest("Обязательны поля: name, slug и categoryId");
    }
    if (data.price === undefined || Number.isNaN(data.price)) {
      throw badRequest("Укажите цену (число)");
    }
    if (data.stock === undefined || Number.isNaN(data.stock)) {
      throw badRequest("Укажите остаток на складе (число)");
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        subcategory: data.subcategory || null,
        description: data.description || null,
        usage: data.usage || null,
        manufacturer: data.manufacturer || null,
        activeComponents: data.activeComponents || null,
        weightGr:
          typeof data.weightGr === "number" && !Number.isNaN(data.weightGr) ? data.weightGr : null,
        country: data.country || null,
        barcode: data.barcode || null,
        characteristics: data.characteristics || null,
        composition: data.composition || null,
        tabLabelDescription: data.tabLabelDescription ?? null,
        tabLabelCharacteristics: data.tabLabelCharacteristics ?? null,
        tabLabelComposition: data.tabLabelComposition ?? null,
        price: data.price,
        stock: data.stock,
        imageUrl: data.imageUrl || null,
        isPublished: data.isPublished ?? true,
        categoryId: data.categoryId,
      },
      include: { category: true },
    });

    res.status(201).json(toJsonProduct(product));
  }),
);

adminRouter.patch(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) throw badRequest("Некорректный id товара");

    const data = mapProductInput(req.body);
    if (!Object.values(data).some((value) => value !== undefined)) {
      throw badRequest("Укажите хотя бы одно поле для изменения");
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        subcategory: data.subcategory,
        description: data.description,
        usage: data.usage,
        manufacturer: data.manufacturer,
        activeComponents: data.activeComponents,
        weightGr: data.weightGr,
        country: data.country,
        barcode: data.barcode,
        characteristics: data.characteristics,
        composition: data.composition,
        tabLabelDescription: data.tabLabelDescription,
        tabLabelCharacteristics: data.tabLabelCharacteristics,
        tabLabelComposition: data.tabLabelComposition,
        price: data.price,
        stock: data.stock,
        imageUrl: data.imageUrl,
        isPublished: data.isPublished,
        categoryId: data.categoryId,
      },
      include: { category: true },
    });

    res.json(toJsonProduct(product));
  }),
);

adminRouter.patch(
  "/products/:id/publish",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) throw badRequest("Некорректный id товара");

    if (typeof req.body?.isPublished !== "boolean") {
      throw badRequest("Поле isPublished должно быть логическим (true/false)");
    }

    const product = await prisma.product.update({
      where: { id },
      data: { isPublished: req.body.isPublished },
      include: { category: true },
    });

    res.json(toJsonProduct(product));
  }),
);

adminRouter.delete(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) throw badRequest("Некорректный id товара");

    const inUse = await prisma.orderItem.count({
      where: { productId: id },
    });
    if (inUse > 0) {
      throw badRequest(
        "Товар указан в заказах и не может быть удалён. Скройте его с витрины (isPublished).",
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    res.status(204).send();
  }),
);

adminRouter.get(
  "/orders/:id/txt",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) throw notFound("Заказ не найден");

    const lines = [
      `ORDER #${order.id}`,
      `STATUS: ${order.status}`,
      `CREATED: ${order.createdAt.toISOString()}`,
      "",
      `CUSTOMER: ${order.fullName}`,
      `EMAIL: ${order.email}`,
      `PHONE: ${order.phone}`,
      `CITY: ${order.city}`,
      `ADDRESS: ${order.addressLine}`,
      `APARTMENT: ${order.apartment || "-"}`,
      `ENTRANCE: ${order.entrance || "-"}`,
      `INTERCOM: ${order.intercom || "-"}`,
      `FLOOR: ${order.floor || "-"}`,
      `PROMO: ${order.promoCode || "-"}`,
      `COMMENT: ${order.comment || "-"}`,
      "",
      "ITEMS:",
      ...order.items.map(
        (item) =>
          `- ${item.product.name} x${item.quantity} @ ${item.unitPrice.toString()}`,
      ),
      "",
      `TOTAL: ${order.totalAmount.toString()}`,
    ];

    const payload = lines.join("\n");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="order-${order.id}.txt"`,
    );
    res.send(payload);
  }),
);
