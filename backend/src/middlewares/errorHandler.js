import multer from "multer";
import { Prisma } from "@prisma/client";
import { HttpError } from "../utils/httpError.js";

export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const targets = error.meta?.target;
      const hint = Array.isArray(targets) ? targets.join(", ") : String(targets || "");
      return res.status(409).json({
        message: hint.includes("slug")
          ? "Товар с таким slug уже есть — укажите другой slug."
          : "Запись с такими уникальными полями уже существует.",
      });
    }
    if (error.code === "P2003") {
      return res.status(400).json({
        message: "Неверная связь с категорией: проверьте categoryId (ID категории из базы).",
      });
    }
    console.error("Prisma", error.code, error.meta);
    return res.status(400).json({
      message: "Ошибка базы данных. Проверьте введённые данные.",
    });
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      message:
        "Некорректные данные (проверьте: цена и остаток — числа, вес в граммах — целое число, categoryId существует).",
    });
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Файл слишком большой (максимум 8 МБ)" });
    }
    return res.status(400).json({ message: "Ошибка загрузки файла" });
  }

  if (error instanceof Error && error.message === "Допустимы только файлы изображений") {
    return res.status(400).json({ message: error.message });
  }

  if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Недействительный или просроченный токен" });
  }

  console.error(error);
  return res.status(500).json({ message: "Внутренняя ошибка сервера" });
}
