import type { FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import { queueService } from "../services/queueService.js";

const queueRoutes: FastifyPluginAsync = async (fastify) => {
  // 큐 상태 조회
  fastify.get(
    "/queue/stats",
    {
      schema: {
        tags: ["Queue"],
        summary: "Get queue statistics",
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              crawlQueue: Type.Object({
                waiting: Type.Number(),
                active: Type.Number(),
                completed: Type.Number(),
                failed: Type.Number(),
              }),
              singleCrawlQueue: Type.Object({
                waiting: Type.Number(),
                active: Type.Number(),
                completed: Type.Number(),
                failed: Type.Number(),
              }),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const stats = await queueService.getQueueStats();

      return {
        success: true,
        data: stats,
      };
    }
  );

  // 큐 정리
  fastify.delete(
    "/queue/clear/:queueName",
    {
      schema: {
        tags: ["Queue"],
        summary: "Clear queue jobs",
        params: Type.Object({
          queueName: Type.Union([
            Type.Literal("crawl"),
            Type.Literal("single"),
            Type.Literal("all"),
          ]),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { queueName } = request.params;

      await queueService.clearQueue(queueName);

      return {
        success: true,
        message: `${queueName} queue(s) cleared successfully`,
      };
    }
  );
};

export default queueRoutes;
