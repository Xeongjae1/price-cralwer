import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyPluginAsync } from "fastify";

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  const isDev = process.env.NODE_ENV !== "production";

  await fastify.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "SmartStore Price Crawler API",
        description: "API for SmartStore price crawling automation",
        version: "0.2.0",
      },
      servers: [
        {
          url: isDev
            ? "http://localhost:3001"
            : process.env.API_URL || "http://localhost:3001",
          description: isDev ? "Development server" : "Production server",
        },
      ],
      tags: [
        { name: "Health", description: "Health check endpoints" },
        { name: "Products", description: "Product management endpoints" },
        { name: "Crawling", description: "Web crawling endpoints" },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
    staticCSP: true,
  });
};

export default fp(swaggerPlugin, {
  name: "swagger-plugin",
});
