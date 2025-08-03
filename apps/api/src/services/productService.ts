import {
  db,
  products,
  priceHistory,
  notifications,
  type Product,
  type NewProduct,
} from "@repo/database";
import { eq, desc, like, and, sql, count } from "drizzle-orm";

export interface CreateProductData {
  name: string;
  storeUrl: string;
  targetPrice?: number;
}

export interface ProductListQuery {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}

export interface ProductWithHistory extends Product {
  latestPrice?: {
    price: string;
    checkedAt: Date;
    isAvailable: boolean;
  };
  unreadNotifications?: number;
}

export class ProductService {
  async getProducts(query: ProductListQuery) {
    const { page, limit, search, isActive } = query;
    const offset = (page - 1) * limit;

    // 검색 조건 구성
    const conditions = [];

    if (search) {
      conditions.push(like(products.name, `%${search}%`));
    }

    if (typeof isActive === "boolean") {
      conditions.push(eq(products.isActive, isActive));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 전체 개수 조회
    const [totalResult] = await db
      .select({ count: count() })
      .from(products)
      .where(whereClause);

    const total = totalResult.count;

    // 상품 목록 조회 (최신 가격 정보 포함)
    const productList = await db
      .select({
        id: products.id,
        name: products.name,
        storeUrl: products.storeUrl,
        targetPrice: products.targetPrice,
        currentPrice: products.currentPrice,
        isActive: products.isActive,
        lastChecked: products.lastChecked,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.updatedAt))
      .limit(limit)
      .offset(offset);

    // 각 상품의 최신 가격 정보와 읽지 않은 알림 수 조회
    const enrichedProducts: ProductWithHistory[] = [];

    for (const product of productList) {
      // 최신 가격 정보
      const [latestPrice] = await db
        .select({
          price: priceHistory.price,
          checkedAt: priceHistory.checkedAt,
          isAvailable: priceHistory.isAvailable,
        })
        .from(priceHistory)
        .where(eq(priceHistory.productId, product.id))
        .orderBy(desc(priceHistory.checkedAt))
        .limit(1);

      // 읽지 않은 알림 수
      const [unreadCount] = await db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.productId, product.id),
            eq(notifications.isRead, false)
          )
        );

      enrichedProducts.push({
        ...product,
        latestPrice: latestPrice || undefined,
        unreadNotifications: unreadCount.count,
      });
    }

    return {
      data: enrichedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getProduct(id: number): Promise<ProductWithHistory | null> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) return null;

    // 최신 가격 정보
    const [latestPrice] = await db
      .select({
        price: priceHistory.price,
        checkedAt: priceHistory.checkedAt,
        isAvailable: priceHistory.isAvailable,
      })
      .from(priceHistory)
      .where(eq(priceHistory.productId, id))
      .orderBy(desc(priceHistory.checkedAt))
      .limit(1);

    // 읽지 않은 알림 수
    const [unreadCount] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(eq(notifications.productId, id), eq(notifications.isRead, false))
      );

    return {
      ...product,
      latestPrice: latestPrice || undefined,
      unreadNotifications: unreadCount.count,
    };
  }

  async createProduct(data: CreateProductData): Promise<Product> {
    const newProduct: NewProduct = {
      name: data.name,
      storeUrl: data.storeUrl,
      targetPrice: data.targetPrice?.toString(),
      isActive: true,
    };

    const [product] = await db.insert(products).values(newProduct).returning();

    return product;
  }

  async updateProduct(
    id: number,
    data: Partial<CreateProductData>
  ): Promise<Product | null> {
    const updateData: Partial<NewProduct> = {
      updatedAt: new Date(),
    };

    if (data.name) updateData.name = data.name;
    if (data.storeUrl) updateData.storeUrl = data.storeUrl;
    if (data.targetPrice !== undefined) {
      updateData.targetPrice = data.targetPrice?.toString();
    }

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    return updatedProduct || null;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();

    return result.length > 0;
  }

  async toggleProductStatus(id: number): Promise<Product | null> {
    // 현재 상태 조회
    const [currentProduct] = await db
      .select({ isActive: products.isActive })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!currentProduct) return null;

    // 상태 토글
    const [updatedProduct] = await db
      .update(products)
      .set({
        isActive: !currentProduct.isActive,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    return updatedProduct || null;
  }

  async getPriceHistory(productId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await db
      .select({
        price: priceHistory.price,
        isAvailable: priceHistory.isAvailable,
        checkedAt: priceHistory.checkedAt,
      })
      .from(priceHistory)
      .where(
        and(
          eq(priceHistory.productId, productId),
          sql`${priceHistory.checkedAt} >= ${startDate}`
        )
      )
      .orderBy(desc(priceHistory.checkedAt));
  }
}

export const productService = new ProductService();
