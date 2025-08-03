import {
  db,
  products,
  priceHistory,
  notifications,
  crawlJobs,
} from "@repo/database";
import { eq, desc, and, gte, lte, count, avg, min, max } from "drizzle-orm";

export interface PriceAlert {
  productId: number;
  productName: string;
  currentPrice: number;
  previousPrice?: number;
  targetPrice?: number;
  priceChange: number;
  priceChangePercent: number;
  alertType:
    | "target_reached"
    | "price_drop"
    | "price_spike"
    | "availability_change";
}

export interface MonitoringStats {
  totalProducts: number;
  activeProducts: number;
  totalPriceChecks: number;
  successfulCrawls: number;
  failedCrawls: number;
  averagePrice: number;
  priceAlerts: number;
  lastCrawlTime?: Date;
}

export class MonitoringService {
  // 가격 변동 모니터링 및 알림 생성
  async checkPriceAlerts(): Promise<PriceAlert[]> {
    const alerts: PriceAlert[] = [];

    try {
      // 최근 24시간 내 가격이 업데이트된 상품들 조회
      const recentUpdates = await db
        .select({
          productId: priceHistory.productId,
          productName: products.name,
          currentPrice: priceHistory.price,
          targetPrice: products.targetPrice,
          checkedAt: priceHistory.checkedAt,
        })
        .from(priceHistory)
        .innerJoin(products, eq(priceHistory.productId, products.id))
        .where(
          and(
            eq(products.isActive, true),
            gte(
              priceHistory.checkedAt,
              new Date(Date.now() - 24 * 60 * 60 * 1000)
            )
          )
        )
        .orderBy(desc(priceHistory.checkedAt));

      // 상품별로 최신 2개 가격 비교
      const productPrices = new Map<
        number,
        Array<{ price: number; checkedAt: Date }>
      >();

      recentUpdates.forEach((update) => {
        const productId = update.productId;
        if (!productPrices.has(productId)) {
          productPrices.set(productId, []);
        }

        const prices = productPrices.get(productId)!;
        if (prices.length < 2) {
          prices.push({
            price: parseFloat(update.currentPrice),
            checkedAt: update.checkedAt,
          });
        }
      });

      // 가격 변동 분석
      for (const [productId, prices] of productPrices) {
        if (prices.length >= 2) {
          const currentPrice = prices[0].price;
          const previousPrice = prices[1].price;
          const priceChange = currentPrice - previousPrice;
          const priceChangePercent = (priceChange / previousPrice) * 100;

          const product = recentUpdates.find((u) => u.productId === productId);
          if (!product) continue;

          // 목표가 달성 체크
          if (product.targetPrice) {
            const targetPrice = parseFloat(product.targetPrice);
            if (currentPrice <= targetPrice && previousPrice > targetPrice) {
              alerts.push({
                productId,
                productName: product.productName,
                currentPrice,
                previousPrice,
                targetPrice,
                priceChange,
                priceChangePercent,
                alertType: "target_reached",
              });

              await this.createNotification(
                productId,
                "target_reached",
                `목표가 달성!`,
                `${product.productName}이 목표가 ${targetPrice.toLocaleString()}원에 도달했습니다. (현재: ${currentPrice.toLocaleString()}원)`
              );
            }
          }

          // 급격한 가격 하락 (10% 이상)
          if (priceChangePercent <= -10) {
            alerts.push({
              productId,
              productName: product.productName,
              currentPrice,
              previousPrice,
              targetPrice: product.targetPrice
                ? parseFloat(product.targetPrice)
                : undefined,
              priceChange,
              priceChangePercent,
              alertType: "price_drop",
            });

            await this.createNotification(
              productId,
              "price_drop",
              `가격 급락 알림`,
              `${product.productName}의 가격이 ${Math.abs(priceChangePercent).toFixed(1)}% 하락했습니다. (${previousPrice.toLocaleString()}원 → ${currentPrice.toLocaleString()}원)`
            );
          }

          // 급격한 가격 상승 (20% 이상)
          if (priceChangePercent >= 20) {
            alerts.push({
              productId,
              productName: product.productName,
              currentPrice,
              previousPrice,
              targetPrice: product.targetPrice
                ? parseFloat(product.targetPrice)
                : undefined,
              priceChange,
              priceChangePercent,
              alertType: "price_spike",
            });

            await this.createNotification(
              productId,
              "price_spike",
              `가격 급등 알림`,
              `${product.productName}의 가격이 ${priceChangePercent.toFixed(1)}% 상승했습니다. (${previousPrice.toLocaleString()}원 → ${currentPrice.toLocaleString()}원)`
            );
          }
        }
      }

      console.log(`[Monitoring] Generated ${alerts.length} price alerts`);
      return alerts;
    } catch (error) {
      console.error("[Monitoring] Failed to check price alerts:", error);
      return [];
    }
  }

  // 시스템 통계 조회
  async getSystemStats(): Promise<MonitoringStats> {
    try {
      const [
        totalProductsResult,
        activeProductsResult,
        totalPriceChecksResult,
        crawlStatsResult,
        avgPriceResult,
        alertsResult,
        lastCrawlResult,
      ] = await Promise.all([
        // 전체 상품 수
        db.select({ count: count() }).from(products),

        // 활성 상품 수
        db
          .select({ count: count() })
          .from(products)
          .where(eq(products.isActive, true)),

        // 전체 가격 체크 수
        db.select({ count: count() }).from(priceHistory),

        // 크롤링 통계
        db
          .select({
            total: count(),
            // TODO: 성공/실패 구분을 위한 추가 필드 필요
          })
          .from(crawlJobs),

        // 평균 가격
        db
          .select({
            avg: avg(priceHistory.price),
          })
          .from(priceHistory)
          .where(
            gte(
              priceHistory.checkedAt,
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            )
          ),

        // 읽지 않은 알림 수
        db
          .select({ count: count() })
          .from(notifications)
          .where(eq(notifications.isRead, false)),

        // 마지막 크롤링 시간
        db
          .select({
            lastCrawl: max(priceHistory.checkedAt),
          })
          .from(priceHistory),
      ]);

      return {
        totalProducts: totalProductsResult[0]?.count || 0,
        activeProducts: activeProductsResult[0]?.count || 0,
        totalPriceChecks: totalPriceChecksResult[0]?.count || 0,
        successfulCrawls: crawlStatsResult[0]?.total || 0, // TODO: 성공/실패 구분 필요
        failedCrawls: 0, // TODO: 실패한 크롤링 수 계산
        averagePrice: parseFloat(avgPriceResult[0]?.avg || "0"),
        priceAlerts: alertsResult[0]?.count || 0,
        lastCrawlTime: lastCrawlResult[0]?.lastCrawl || undefined,
      };
    } catch (error) {
      console.error("[Monitoring] Failed to get system stats:", error);
      throw error;
    }
  }

  // 가격 트렌드 분석
  async getPriceTrends(
    productId: number,
    days: number = 30
  ): Promise<{
    trend: "rising" | "falling" | "stable";
    trendPercentage: number;
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    pricePoints: Array<{ date: Date; price: number }>;
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const priceData = await db
        .select({
          price: priceHistory.price,
          checkedAt: priceHistory.checkedAt,
        })
        .from(priceHistory)
        .where(
          and(
            eq(priceHistory.productId, productId),
            gte(priceHistory.checkedAt, startDate)
          )
        )
        .orderBy(priceHistory.checkedAt);

      if (priceData.length < 2) {
        throw new Error("Insufficient price data for trend analysis");
      }

      const prices = priceData.map((p) => parseFloat(p.price));
      const firstPrice = prices[0];
      const lastPrice = prices[prices.length - 1];
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice =
        prices.reduce((sum, price) => sum + price, 0) / prices.length;

      // 트렌드 계산
      const trendPercentage = ((lastPrice - firstPrice) / firstPrice) * 100;
      let trend: "rising" | "falling" | "stable";

      if (trendPercentage > 5) {
        trend = "rising";
      } else if (trendPercentage < -5) {
        trend = "falling";
      } else {
        trend = "stable";
      }

      const pricePoints = priceData.map((p) => ({
        date: p.checkedAt,
        price: parseFloat(p.price),
      }));

      return {
        trend,
        trendPercentage,
        minPrice,
        maxPrice,
        avgPrice,
        pricePoints,
      };
    } catch (error) {
      console.error(
        `[Monitoring] Failed to get price trends for product ${productId}:`,
        error
      );
      throw error;
    }
  }

  // 알림 생성
  private async createNotification(
    productId: number,
    type: string,
    title: string,
    message: string
  ): Promise<void> {
    try {
      await db.insert(notifications).values({
        productId,
        type,
        title,
        message,
        isRead: false,
      });
    } catch (error) {
      console.error("[Monitoring] Failed to create notification:", error);
    }
  }

  // 성능 메트릭 수집
  async getPerformanceMetrics(): Promise<{
    avgCrawlTime: number;
    crawlSuccessRate: number;
    queueSize: number;
    systemLoad: {
      memory: number;
      cpu: number;
    };
  }> {
    try {
      // TODO: 크롤링 시간 및 성공률 메트릭 수집
      // 현재는 모의 데이터 반환

      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      return {
        avgCrawlTime: 2500, // ms
        crawlSuccessRate: 95.5, // %
        queueSize: 0, // TODO: 실제 큐 크기 조회
        systemLoad: {
          memory: Math.round(
            (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
          ),
          cpu: Math.round((cpuUsage.user + cpuUsage.system) / 1000), // 대략적인 CPU 사용률
        },
      };
    } catch (error) {
      console.error("[Monitoring] Failed to get performance metrics:", error);
      throw error;
    }
  }

  // 정기적인 모니터링 실행
  async runPeriodicMonitoring(): Promise<void> {
    try {
      console.log("[Monitoring] Running periodic monitoring check...");

      // 가격 알림 체크
      await this.checkPriceAlerts();

      // 시스템 상태 체크
      const stats = await this.getSystemStats();
      console.log(
        `[Monitoring] System stats: ${stats.activeProducts} active products, ${stats.priceAlerts} unread alerts`
      );

      // 성능 메트릭 체크
      const metrics = await this.getPerformanceMetrics();
      if (metrics.systemLoad.memory > 80) {
        console.warn(
          `[Monitoring] High memory usage: ${metrics.systemLoad.memory}%`
        );
      }
    } catch (error) {
      console.error("[Monitoring] Periodic monitoring failed:", error);
    }
  }
}

// 싱글톤 인스턴스
export const monitoringService = new MonitoringService();

// 주기적 모니터링 시작 (5분마다)
setInterval(
  () => {
    monitoringService.runPeriodicMonitoring().catch(console.error);
  },
  5 * 60 * 1000
);
