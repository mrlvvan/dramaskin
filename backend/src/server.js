import { prisma } from "./config/prisma.js";
import { env } from "./config/env.js";
import { app } from "./app.js";

const server = app.listen(env.port, () => {
  console.log(`Backend started on http://localhost:${env.port}`);
});

async function gracefulShutdown() {
  console.log("Shutting down...");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
