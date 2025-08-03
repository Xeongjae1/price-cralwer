import Fastify from "fastify";
import { testConnection } from "@repo/database";
import "dotenv/config";

console.log("🚀 Starting API server...");

const fastify = Fastify({
  logger: true,
});

// 헬스체크
fastify.get("/health", async (request, reply) => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// 데이터베이스 테스트
fastify.get("/db-test", async (request, reply) => {
  try {
    const isConnected = await testConnection();
    return { dbStatus: isConnected ? "connected" : "failed" };
  } catch (error) {
    return { dbStatus: "error", message: error.message };
  }
});

// 서버 시작
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`✅ Server running on http://localhost:${port}`);
    console.log(`🔗 Health: http://localhost:${port}/health`);
    console.log(`🗄️  DB Test: http://localhost:${port}/db-test`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// import Fastify from "fastify";
// import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
// import "dotenv/config";

// // 데이터베이스 연결 import
// import { testConnection } from "@repo/database";

// // 서비스 import
// import { schedulerService } from "./services/schedulerService.js";
// import { queueService } from "./services/queueService.js";

// // 플러그인과 라우터 import
// import plugins from "./plugins/index.js";
// import routes from "./routes/index.js";

// const isDev = process.env.NODE_ENV !== "production";

// const fastify = Fastify({
//   logger: isDev
//     ? {
//         level: "info",
//         transport: {
//           target: "pino-pretty",
//           options: {
//             colorize: true,
//             translateTime: "HH:MM:ss",
//             ignore: "pid,hostname",
//           },
//         },
//       }
//     : true,
// }).withTypeProvider<TypeBoxTypeProvider>();

// // 데이터베이스 연결 테스트
// async function initializeDatabase() {
//   try {
//     const isConnected = await testConnection();
//     if (!isConnected) {
//       throw new Error("Database connection failed");
//     }
//     console.log("✅ Database initialized successfully");
//   } catch (error) {
//     console.error("❌ Database initialization failed:", error);
//     process.exit(1);
//   }
// }

// // 서비스 초기화
// async function initializeServices() {
//   try {
//     // 스케줄러 시작
//     schedulerService.startAll();
//     console.log("✅ Scheduler service initialized");

//     // 큐 서비스는 이미 생성자에서 초기화됨
//     console.log("✅ Queue service initialized");
//   } catch (error) {
//     console.error("❌ Services initialization failed:", error);
//     process.exit(1);
//   }
// }

// // 플러그인 등록
// await fastify.register(plugins);

// // 라우트 등록
// await fastify.register(routes);

// // 에러 핸들러
// fastify.setErrorHandler((error, request, reply) => {
//   fastify.log.error(error);

//   reply.status(500).send({
//     success: false,
//     error: "Internal Server Error",
//     message: isDev ? error.message : "Something went wrong",
//   });
// });

// // 404 핸들러
// fastify.setNotFoundHandler((request, reply) => {
//   reply.status(404).send({
//     success: false,
//     error: "Not Found",
//     message: `Route ${request.method} ${request.url} not found`,
//   });
// });

// // 서버 시작
// const start = async () => {
//   try {
//     // 데이터베이스 초기화
//     await initializeDatabase();

//     // 서비스 초기화
//     await initializeServices();

//     const port = Number(process.env.PORT) || 3001;
//     const host = process.env.HOST || "0.0.0.0";

//     await fastify.listen({ port, host });

//     console.log("🚀 Server listening on http://localhost:" + port);
//     console.log("📚 API Documentation: http://localhost:" + port + "/docs");
//     console.log("🔌 WebSocket: ws://localhost:" + port + "/ws");
//     console.log("❤️  Health Check: http://localhost:" + port + "/health");
//     console.log(
//       "⏰ Scheduler: http://localhost:" + port + "/api/scheduler/schedules"
//     );
//     console.log(
//       "📊 Queue Stats: http://localhost:" + port + "/api/queue/stats"
//     );
//   } catch (err) {
//     fastify.log.error(err);
//     process.exit(1);
//   }
// };

// // Graceful shutdown
// const gracefulShutdown = async (signal: string) => {
//   fastify.log.info(`Received ${signal}, shutting down gracefully`);

//   try {
//     // 서비스 정리
//     schedulerService.stopAll();
//     await queueService.close();

//     await fastify.close();
//     console.log("🔌 All services closed gracefully");
//     process.exit(0);
//   } catch (err) {
//     fastify.log.error(err);
//     process.exit(1);
//   }
// };

// process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
// process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// start();
