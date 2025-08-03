import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyPluginAsync } from "fastify";

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  const isDev = process.env.NODE_ENV !== "production";

  await fastify.register(cors, {
    origin: isDev ? true : process.env.ALLOWED_ORIGINS?.split(",") || [],
    credentials: true,
  });
};

export default fp(corsPlugin, {
  name: "cors-plugin",
});
