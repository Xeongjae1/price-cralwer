import { Type } from "@sinclair/typebox";

export const ProductSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  storeUrl: Type.String({ format: "uri" }),
  targetPrice: Type.Optional(Type.Number({ minimum: 0 })),
  currentPrice: Type.Optional(Type.Number({ minimum: 0 })),
  isActive: Type.Boolean(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

export const CreateProductSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  storeUrl: Type.String({ format: "uri" }),
  targetPrice: Type.Optional(Type.Number({ minimum: 0 })),
});

export const ProductListQuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 10 })),
  search: Type.Optional(Type.String()),
});

export const ProductResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: ProductSchema,
  message: Type.Optional(Type.String()),
});

export const ProductListResponseSchema = Type.Object({
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
});
