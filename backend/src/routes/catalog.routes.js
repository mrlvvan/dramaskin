import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { isCloseMatch } from "../utils/fuzzySearch.js";
import { notFound } from "../utils/httpError.js";

export const catalogRouter = Router();

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeQuery(query) {
  return normalizeText(query)
    .split(" ")
    .filter(Boolean);
}

catalogRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    res.json(categories);
  }),
);

catalogRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const categorySlug = req.query.category ? String(req.query.category) : null;
    const subcategory = req.query.subcategory ? String(req.query.subcategory).trim() : null;

    const products = await prisma.product.findMany({
      where: {
        isPublished: true,
        ...(subcategory ? { subcategory } : {}),
        ...(categorySlug
          ? {
              category: {
                slug: categorySlug,
              },
            }
          : {}),
      },
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(products);
  }),
);

catalogRouter.get(
  "/products/search",
  asyncHandler(async (req, res) => {
    const query = String(req.query.q || "").trim();
    if (!query) {
      return res.json([]);
    }
    const normalizedQuery = normalizeText(query);
    if (normalizedQuery.length < 2) {
      return res.json([]);
    }

    const products = await prisma.product.findMany({
      where: { isPublished: true },
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const queryTokens = tokenizeQuery(query).filter((token) => token.length >= 2);
    const minScore = Math.max(3, queryTokens.length * 2);

    const ranked = products
      .map((product) => {
        const primaryFields = [
          product.name,
          product.manufacturer,
          product.subcategory,
        ]
          .filter(Boolean)
          .map(normalizeText);

        const secondaryFields = [
          product.activeComponents,
        ]
          .filter(Boolean)
          .map(normalizeText);

        const weakFields = [
          product.description,
          product.category.name,
        ]
          .filter(Boolean)
          .map(normalizeText);

        let score = 0;
        let hasPrimaryMatch = false;
        for (const token of queryTokens) {
          if (primaryFields.some((field) => field.includes(token))) {
            score += 6;
            hasPrimaryMatch = true;
            continue;
          }

          if (
            token.length >= 4 &&
            primaryFields.some((field) =>
              isCloseMatch(token, field),
            )
          ) {
            score += 3;
            hasPrimaryMatch = true;
          }

          if (secondaryFields.some((field) => field.includes(token))) {
            score += 2;
            continue;
          }

          if (
            token.length >= 4 &&
            secondaryFields.some((field) =>
              isCloseMatch(token, field),
            )
          ) {
            score += 1;
          }

          if (weakFields.some((field) => field.includes(token))) {
            score += 1;
          }
        }

        if (primaryFields.some((field) => field.includes(normalizedQuery))) {
          score += 8;
          hasPrimaryMatch = true;
        } else if (secondaryFields.some((field) => field.includes(normalizedQuery))) {
          score += 3;
        } else if (weakFields.some((field) => field.includes(normalizedQuery))) {
          score += 1;
        }

        return {
          product,
          score,
          hasPrimaryMatch,
        };
      })
      .filter((item) => item.hasPrimaryMatch && item.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product)
      .slice(0, 50);

    return res.json(ranked);
  }),
);

catalogRouter.get(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const product = await prisma.product.findFirst({
      where: { id, isPublished: true },
      include: { category: true },
    });

    if (!product) throw notFound("Товар не найден");
    res.json(product);
  }),
);
