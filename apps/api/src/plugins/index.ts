import type { FastifyPluginAsync } from "fastify";
import corsPlugin from "./cors";
import swaggerPlugin from "./swagger";
import websocketPlugin from "./websocket";

const pluginsPlugin: FastifyPluginAsync = async (fastify) => {
  // 순서가 중요함
  await fastify.register(corsPlugin);
  await fastify.register(websocketPlugin);
  await fastify.register(swaggerPlugin);
};

export default pluginsPlugin;
