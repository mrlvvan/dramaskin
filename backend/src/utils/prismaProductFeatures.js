import { Prisma } from "@prisma/client";

let cachedHasColorVariants;
let warnedSkipColorVariants;

/**
 * true, если текущий сгенерированный Prisma Client знает поле Product.colorVariants.
 * На старом деплое (без migrate generate) поля нет — писать colorVariants в update нельзя.
 */
export function productModelHasColorVariants() {
  if (cachedHasColorVariants !== undefined) return cachedHasColorVariants;
  try {
    const product = Prisma.dmmf.datamodel.models.find((m) => m.name === "Product");
    cachedHasColorVariants = Boolean(product?.fields?.some((f) => f.name === "colorVariants"));
  } catch {
    cachedHasColorVariants = false;
  }
  return cachedHasColorVariants;
}

/** Один раз в лог, если клиент без colorVariants, а фронт прислал поле. */
export function warnIfColorVariantsIgnored(body) {
  if (warnedSkipColorVariants) return;
  if (!body || body.colorVariants === undefined) return;
  if (productModelHasColorVariants()) return;
  warnedSkipColorVariants = true;
  console.warn(
    "[dramma] В теле запроса есть colorVariants, но Prisma Client собран без поля Product.colorVariants. " +
      "На сервере: npx prisma migrate deploy && npx prisma generate, затем перезапуск Node.",
  );
}
