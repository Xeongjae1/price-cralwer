import type { FastifyPluginAsync } from "fastify";
import { HealthResponseSchema } from "../schemas/index";

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Health check",
        response: {
          200: HealthResponseSchema,
        },
      },
    },
    async (request, reply) => {
      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || "0.0.0",
      };
    }
  );
};

export default healthRoutes;
