import { Type } from "@sinclair/typebox";

export const CrawlJobSchema = Type.Object({
  id: Type.String(),
  status: Type.Union([
    Type.Literal("pending"),
    Type.Literal("running"),
    Type.Literal("completed"),
    Type.Literal("failed"),
  ]),
  progress: Type.Number({ minimum: 0, maximum: 100 }),
  createdAt: Type.String({ format: "date-time" }),
  completedAt: Type.Optional(Type.String({ format: "date-time" })),
});

export const StartCrawlSchema = Type.Object({
  productIds: Type.Array(Type.String(), { minItems: 1 }),
});

export const CrawlJobResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: CrawlJobSchema,
});

export const StartCrawlResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    jobId: Type.String(),
    message: Type.String(),
  }),
});
