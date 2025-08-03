import type { FastifyPluginAsync } from "fastify";
import healthRoutes from "./health.js";
import productRoutes from "./products.js";
import crawlRoutes from "./crawl.js";
import websocketRoutes from "./websocket.js";
import schedulerRoutes from "./scheduler.js";
import queueRoutes from "./queue.js";

const routes: FastifyPluginAsync = async (fastify) => {
  // Health check (루트 레벨)
  await fastify.register(healthRoutes);

  // WebSocket (루트 레벨)
  await fastify.register(websocketRoutes);

  // API 라우트들 (/api prefix)
  await fastify.register(async function (fastify) {
    await fastify.register(productRoutes, { prefix: "/api" });
    await fastify.register(crawlRoutes, { prefix: "/api" });
    await fastify.register(schedulerRoutes, { prefix: "/api" });
    await fastify.register(queueRoutes, { prefix: "/api" });
  });
};

export default routes;
