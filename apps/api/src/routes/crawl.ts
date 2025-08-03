import type { FastifyPluginAsync } from "fastify";
import {
  StartCrawlSchema,
  StartCrawlResponseSchema,
  CrawlJobResponseSchema,
  ErrorResponseSchema,
} from "../schemas/index";
import { crawlService } from "../services/crawlService";

const crawlRoutes: FastifyPluginAsync = async (fastify) => {
  // 크롤링 시작
  fastify.post(
    "/crawl/start",
    {
      schema: {
        tags: ["Crawling"],
        summary: "Start crawling job",
        body: StartCrawlSchema,
        response: {
          200: StartCrawlResponseSchema,
          400: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { productIds } = request.body;
        const job = await crawlService.startCrawlJob(productIds);

        fastify.log.info({ jobId: job.id, productIds }, "Crawling job started");

        return {
          success: true,
          data: {
            jobId: job.id,
            message: `Crawling job started for ${productIds.length} products`,
          },
        };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500);
        return {
          success: false,
          error: "Internal Server Error",
          message: "Failed to start crawling job",
        };
      }
    }
  );

  // 크롤링 상태 조회
  fastify.get(
    "/crawl/status/:jobId",
    {
      schema: {
        tags: ["Crawling"],
        summary: "Get crawling job status",
        params: {
          type: "object",
          properties: {
            jobId: { type: "string" },
          },
          required: ["jobId"],
        },
        response: {
          200: CrawlJobResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { jobId } = request.params as { jobId: string };
        const job = await crawlService.getCrawlJobStatus(jobId);

        if (!job) {
          reply.status(404);
          return {
            success: false,
            error: "Not Found",
            message: "Crawl job not found",
          };
        }

        return {
          success: true,
          data: job,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500);
        return {
          success: false,
          error: "Internal Server Error",
          message: "Failed to get crawl job status",
        };
      }
    }
  );

  fastify.post('/crawl/product/:id', {
  schema: {
    tags: ['Crawling'],
    summary: 'Crawl single product immediately',
    params: Type.Object({
      id: Type.String({ pattern: '^[0-9]+ })
    }),
    response: {
      200: Type.Object({
        success: Type.Boolean(),
        data: Type.Optional(Type.Object({
          productId: Type.Number(),
          success: Type.Boolean(),
          price: Type.Optional(Type.Number()),
          isAvailable: Type.Boolean(),
          title: Type.Optional(Type.String()),
          lastUpdated: Type.String({ format: 'date-time' }),
          error: Type.Optional(Type.Object({
            code: Type.String(),
            message: Type.String()
          }))
        })),
        message: Type.String()
      }),
      404: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  }
}, async (request, reply) => {
  try {
    const productId = parseInt(request.params.id);
    
    fastify.log.info({ productId }, 'Starting single product crawl');
    
    const result = await crawlService.startSingleProductCrawl(productId);
    
    return {
      success: result.success,
      data: result.data,
      message: result.success 
        ? 'Product crawled successfully' 
        : 'Product crawl failed'
    };
  } catch (error) {
    fastify.log.error(error);
    reply.status(500);
    return {
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to crawl product'
    };
  }
});

// 크롤러 상태 조회
fastify.get('/crawl/crawler-status', {
  schema: {
    tags: ['Crawling'],
    summary: 'Get crawler engine status',
    response: {
      200: Type.Object({
        success: Type.Boolean(),
        data: Type.Object({
          isRunning: Type.Boolean()
        })
      })
    }
  }
}, async (request, reply) => {
  const status = crawlService.getCrawlerStatus();
  
  return {
    success: true,
    data: status
  };
});
};

export default crawlRoutes;
