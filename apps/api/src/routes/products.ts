import type { FastifyPluginAsync } from 'fastify';
import { 
  ProductListQuerySchema,
  ProductListResponseSchema,
  CreateProductSchema,
  ProductResponseSchema,
  ErrorResponseSchema
} from '../schemas/index';
import { productService } from '../services/productService';

const productRoutes: FastifyPluginAsync = async (fastify) => {
  // 상품 목록 조회
  fastify.get('/products', {
    schema: {
      tags: ['Products'],
      summary: 'Get products list',
      querystring: Type.Object({
        page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 10 })),
        search: Type.Optional(Type.String()),
        isActive: Type.Optional(Type.Boolean())
      }),
      response: {
        200: ProductListResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const result = await productService.getProducts(request.query);
      
      return {
        success: true,
        ...result
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500);
      return {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch products'
      };
    }
  });

  // 상품 개별 조회
  fastify.get('/products/:id', {
    schema: {
      tags: ['Products'],
      summary: 'Get product by ID',
      params: Type.Object({
        id: Type.String({ pattern: '^[0-9]+ }) // 숫자만 허용
      }),
      response: {
        200: ProductResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id);
      const product = await productService.getProduct(id);
      
      if (!product) {
        reply.status(404);
        return {
          success: false,
          error: 'Not Found',
          message: 'Product not found'
        };
      }

      return {
        success: true,
        data: product
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500);
      return {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch product'
      };
    }
  });

  // 상품 생성
  fastify.post('/products', {
    schema: {
      tags: ['Products'],
      summary: 'Create new product',
      body: CreateProductSchema,
      response: {
        201: ProductResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const product = await productService.createProduct(request.body);
      
      reply.status(201);
      return {
        success: true,
        data: product,
        message: 'Product created successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      
      // 중복 URL 에러 처리
      if (error instanceof Error && error.message.includes('duplicate key')) {
        reply.status(400);
        return {
          success: false,
          error: 'Bad Request',
          message: 'Product with this store URL already exists'
        };
      }
      
      reply.status(500);
      return {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create product'
      };
    }
  });

  // 상품 수정
  fastify.put('/products/:id', {
    schema: {
      tags: ['Products'],
      summary: 'Update product',
      params: Type.Object({
        id: Type.String({ pattern: '^[0-9]+ })
      }),
      body: Type.Partial(CreateProductSchema),
      response: {
        200: ProductResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id);
      const product = await productService.updateProduct(id, request.body);
      
      if (!product) {
        reply.status(404);
        return {
          success: false,
          error: 'Not Found',
          message: 'Product not found'
        };
      }

      return {
        success: true,
        data: product,
        message: 'Product updated successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500);
      return {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update product'
      };
    }
  });

  // 상품 상태 토글 (활성화/비활성화)
  fastify.patch('/products/:id/toggle', {
    schema: {
      tags: ['Products'],
      summary: 'Toggle product active status',
      params: Type.Object({
        id: Type.String({ pattern: '^[0-9]+ })
      }),
      response: {
        200: ProductResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id);
      const product = await productService.toggleProductStatus(id);
      
      if (!product) {
        reply.status(404);
        return {
          success: false,
          error: 'Not Found',
          message: 'Product not found'
        };
      }

      return {
        success: true,
        data: product,
        message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500);
      return {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to toggle product status'
      };
    }
  });

  // 상품 삭제
  fastify.delete('/products/:id', {
    schema: {
      tags: ['Products'],
      summary: 'Delete product',
      params: Type.Object({
        id: Type.String({ pattern: '^[0-9]+ })
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id);
      const success = await productService.deleteProduct(id);
      
      if (!success) {
        reply.status(404);
        return {
          success: false,
          error: 'Not Found',
          message: 'Product not found'
        };
      }

      return {
        success: true,
        message: 'Product deleted successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500);
      return {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to delete product'
      };
    }
  });

  // 상품 가격 히스토리 조회
  fastify.get('/products/:id/price-history', {
    schema: {
      tags: ['Products'],
      summary: 'Get product price history',
      params: Type.Object({
        id: Type.String({ pattern: '^[0-9]+ })
      }),
      querystring: Type.Object({
        days: Type.Optional(Type.Number({ minimum: 1, maximum: 365, default: 30 }))
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Array(Type.Object({
            price: Type.String(),
            isAvailable: Type.Boolean(),
            checkedAt: Type.String({ format: 'date-time' })
          }))
        }),
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id);
      const { days = 30 } = request.query;
      
      // 상품 존재 확인
      const product = await productService.getProduct(id);
      if (!product) {
        reply.status(404);
        return {
          success: false,
          error: 'Not Found',
          message: 'Product not found'
        };
      }

      const priceHistory = await productService.getPriceHistory(id, days);
      
      return {
        success: true,
        data: priceHistory
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500);
      return {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch price history'
      };
    }
  });
};

export default productRoutes;