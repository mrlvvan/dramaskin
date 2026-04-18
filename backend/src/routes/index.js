import { Router } from "express";
import { adminRouter } from "./admin.routes.js";
import { authRouter } from "./auth.routes.js";
import { cartRouter } from "./cart.routes.js";
import { catalogRouter } from "./catalog.routes.js";
import { favoritesRouter } from "./favorites.routes.js";
import { ordersRouter } from "./orders.routes.js";
import { userRouter } from "./user.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/", catalogRouter);
apiRouter.use("/", userRouter);
apiRouter.use("/favorites", favoritesRouter);
apiRouter.use("/cart", cartRouter);
apiRouter.use("/orders", ordersRouter);
apiRouter.use("/admin", adminRouter);
