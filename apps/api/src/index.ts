import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import websocket from "@fastify/websocket";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import "dotenv/config";

const fastify = Fastify({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    },
  },
}).withTypeProvider<TypeBoxTypeProvider>();

// CORS 설정
await fastify.register(cors, {
  origin: true,
  credentials: true,
});

// WebSocket 지원
await fastify.register(websocket);

// Swagger 설정
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
        url: "http://localhost:3001",
        description: "Development server",
      },
    ],
  },
});

await fastify.register(swaggerUi, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "full",
    deepLinking: false,
  },
  staticCSP: true,
});

// 스키마 정의 (최신)
const ProductSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  storeUrl: Type.String({ format: "uri" }),
  targetPrice: Type.Optional(Type.Number({ minimum: 0 })),
  currentPrice: Type.Optional(Type.Number({ minimum: 0 })),
  isActive: Type.Boolean(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

const CrawlJobSchema = Type.Object({
  id: Type.String(),
  status: Type.Union([
    Type.Literal("pending"),
    Type.Literal("running"),
    Type.Literal("completed"),
    Type.Literal("failed"),
  ]),
  progress: Type.Number({ minimum: 0, maximum: 100 }),
  createdAt: Type.String({ format: "date-time" }),
});

// WebSocket 연결 처리
fastify.register(async function (fastify) {
  fastify.get("/ws", { websocket: true }, (connection, req) => {
    connection.socket.on("message", (message) => {
      // 실시간 업데이트 처리
      connection.socket.send(
        JSON.stringify({
          type: "pong",
          timestamp: new Date().toISOString(),
        })
      );
    });
  });
});

// 라우트 등록 (최신)
await fastify.register(async function (fastify) {
  // 상품 관련 라우트
  fastify.get(
    "/api/products",
    {
      schema: {
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Array(ProductSchema),
            pagination: Type.Object({
              page: Type.Number(),
              limit: Type.Number(),
              total: Type.Number(),
              totalPages: Type.Number(),
              hasNext: Type.Boolean(),
              hasPrev: Type.Boolean(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      return {
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
  );

  fastify.post(
    "/api/products",
    {
      schema: {
        body: Type.Object({
          name: Type.String({ minLength: 1 }),
          storeUrl: Type.String({ format: "uri" }),
          targetPrice: Type.Optional(Type.Number({ minimum: 0 })),
        }),
        response: {
          201: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
            data: Type.Object({ id: Type.String() }),
          }),
        },
      },
    },
    async (request, reply) => {
      reply.code(201);
      return {
        success: true,
        message: "Product created successfully",
        data: { id: "1" },
      };
    }
  );

  // 크롤링 관련 라우트
  fastify.post(
    "/api/crawl/start",
    {
      schema: {
        body: Type.Object({
          productIds: Type.Array(Type.String()),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              jobId: Type.String(),
              message: Type.String(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      return {
        success: true,
        data: {
          jobId: "1",
          message: "Crawling job started successfully",
        },
      };
    }
  );

  fastify.get(
    "/api/crawl/status/:jobId",
    {
      schema: {
        params: Type.Object({
          jobId: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: CrawlJobSchema,
          }),
        },
      },
    },
    async (request, reply) => {
      return {
        success: true,
        data: {
          id: request.params.jobId,
          status: "running",
          progress: 75,
          createdAt: new Date().toISOString(),
        },
      };
    }
  );

  // 건강 체크
  fastify.get(
    "/health",
    {
      schema: {
        response: {
          200: Type.Object({
            status: Type.String(),
            timestamp: Type.String({ format: "date-time" }),
          }),
        },
      },
    },
    async (request, reply) => {
      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
      };
    }
  );
});

// 서버 시작
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({
      port,
      host: "0.0.0.0",
    });

    console.log("🚀 Server listening on http://localhost:" + port);
    console.log("📚 API Documentation: http://localhost:" + port + "/docs");
    console.log("🔌 WebSocket: ws://localhost:" + port + "/ws");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
