import { prisma } from "../config/prisma.js";
import { generateOneTimeCode } from "../utils/code.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { badRequest, unauthorized } from "../utils/httpError.js";
import { sendAuthCodeEmail } from "./email.service.js";

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function issueTokensForUser(user) {
  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: addDays(new Date(), 7),
    },
  });

  return { accessToken, refreshToken };
}

export async function requestEmailCode(email, purpose = "signup") {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw badRequest("Укажите корректный email");
  }

  const mode = purpose === "login" ? "login" : "signup";

  if (mode === "login") {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user) {
      throw badRequest("Аккаунт с такой почтой не найден");
    }
  }

  const code = generateOneTimeCode();
  const expiresAt = addMinutes(new Date(), 10);

  await prisma.authCode.create({
    data: {
      email: normalizedEmail,
      code,
      expiresAt,
    },
  });

  await sendAuthCodeEmail({ to: normalizedEmail, code });
}

export async function verifyEmailCode(email, code) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedCode = String(code || "").trim();

  if (!normalizedEmail || !normalizedCode) {
    throw badRequest("Укажите email и код");
  }

  const authCode = await prisma.authCode.findFirst({
    where: {
      email: normalizedEmail,
      code: normalizedCode,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!authCode) {
    throw unauthorized("Неверный код");
  }

  await prisma.authCode.update({
    where: { id: authCode.id },
    data: { usedAt: new Date() },
  });

  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { email: normalizedEmail },
    });
  }

  const tokens = await issueTokensForUser(user);

  return {
    ...tokens,
    user,
  };
}

export async function devLogin(email = "demo@dramma.local") {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw badRequest("Укажите корректный email");
  }

  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        firstName: "Demo",
        lastName: "User",
      },
    });
  }

  const tokens = await issueTokensForUser(user);
  return {
    ...tokens,
    user,
  };
}

export async function refreshSession(refreshToken) {
  if (!refreshToken) {
    throw unauthorized("Требуется refresh-токен");
  }

  const payload = verifyRefreshToken(refreshToken);

  const tokenInDb = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!tokenInDb || tokenInDb.expiresAt <= new Date()) {
    throw unauthorized("Refresh-токен недействителен или истёк");
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(payload.userId) },
  });

  if (!user) {
    throw unauthorized("Пользователь не найден");
  }

  await prisma.refreshToken.delete({
    where: { id: tokenInDb.id },
  });

  return issueTokensForUser(user);
}

export async function logout(refreshToken) {
  if (!refreshToken) return;

  await prisma.refreshToken.deleteMany({
    where: { token: refreshToken },
  });
}
