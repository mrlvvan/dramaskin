import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  devLogin,
  logout,
  refreshSession,
  requestEmailCode,
  verifyEmailCode,
} from "../services/auth.service.js";

export const authRouter = Router();

authRouter.post(
  "/request-code",
  asyncHandler(async (req, res) => {
    await requestEmailCode(req.body.email, req.body.purpose);
    res.json({ message: "Код отправлен на почту" });
  }),
);

authRouter.post(
  "/verify-code",
  asyncHandler(async (req, res) => {
    const data = await verifyEmailCode(req.body.email, req.body.code);
    res.json(data);
  }),
);

authRouter.post(
  "/dev-login",
  asyncHandler(async (req, res) => {
    const data = await devLogin(req.body?.email);
    res.json(data);
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const data = await refreshSession(req.body.refreshToken);
    res.json(data);
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    await logout(req.body.refreshToken);
    res.status(204).send();
  }),
);
