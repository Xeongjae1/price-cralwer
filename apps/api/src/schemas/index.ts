export * from "./product";
export * from "./crawl";

import { Type } from "@sinclair/typebox";

// 공통 스키마
export const ErrorResponseSchema = Type.Object({
  success: Type.Literal(false),
  error: Type.String(),
  message: Type.String(),
});

export const HealthResponseSchema = Type.Object({
  status: Type.String(),
  timestamp: Type.String({ format: "date-time" }),
  uptime: Type.Number(),
  version: Type.String(),
});
