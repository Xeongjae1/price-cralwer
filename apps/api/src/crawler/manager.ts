import { SmartStoreCrawler } from "./engines/smartstore";
import {
  BrowserConfig,
  CrawlerOptions,
  CrawlTarget,
  CrawlResult,
} from "./types/index";
import {
  db,
  crawlJobs,
  crawlJobProducts,
  products,
  priceHistory,
  notifications,
} from "@repo/database";
import { eq, and } from "drizzle-orm";

export class CrawlerManager {
  private crawler: SmartStoreCrawler;
  private isRunning: boolean = false;

  constructor() {
    const browserConfig: BrowserConfig = {
      headless: process.env.NODE_ENV === "production",
      timeout: 30000,
      viewport: { width: 1366, height: 768 },
    };

    const crawlerOptions: CrawlerOptions = {
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 30000,
      concurrency: 2,
      respectRobotsTxt: false,
      minDelay: 1000,
      maxDelay: 3000,
      userAgentRotation: true,
      proxyRotation: false,
    };

    this.crawler = new SmartStoreCrawler(browserConfig, crawlerOptions);
  }

  async processCrawlJob(jobId: number): Promise<void> {
    if (this.isRunning) {
      throw new Error("Crawler is already running");
    }

    this.isRunning = true;
    console.log(`[CrawlerManager] Starting crawl job ${jobId}`);

    try {
      // 작업 상태를 running으로 변경
      await db
        .update(crawlJobs)
        .set({ status: "running" })
        .where(eq(crawlJobs.id, jobId));

      // 크롤링할 상품들 가져오기
      const jobProducts = await db
        .select({
          id: crawlJobProducts.id,
          productId: crawlJobProducts.productId,
          name: products.name,
          storeUrl: products.storeUrl,
        })
        .from(crawlJobProducts)
        .innerJoin(products, eq(crawlJobProducts.productId, products.id))
        .where(
          and(
            eq(crawlJobProducts.crawlJobId, jobId),
            eq(crawlJobProducts.status, "pending")
          )
        );

      let processedCount = 0;
      const totalCount = jobProducts.length;

      console.log(`[CrawlerManager] Found ${totalCount} products to crawl`);

      for (const jobProduct of jobProducts) {
        try {
          console.log(
            `[CrawlerManager] Crawling product ${jobProduct.productId}: ${jobProduct.name}`
          );

          const target: CrawlTarget = {
            id: jobProduct.productId,
            name: jobProduct.name,
            url: jobProduct.storeUrl,
          };

          const result = await this.crawler.crawl(target);

          // 결과 저장
          await this.saveCrawlResult(jobProduct.id, result);

          processedCount++;

          // 진행률 업데이트
          const progress = Math.round((processedCount / totalCount) * 100);
          await db
            .update(crawlJobs)
            .set({
              progress,
              processedProducts: processedCount,
            })
            .where(eq(crawlJobs.id, jobId));

          console.log(
            `[CrawlerManager] Progress: ${processedCount}/${totalCount} (${progress}%)`
          );

          // 다음 크롤링 전 지연
          if (processedCount < totalCount) {
            await this.delay(2000, 5000);
          }
        } catch (error) {
          console.error(
            `[CrawlerManager] Failed to crawl product ${jobProduct.productId}:`,
            error
          );

          // 실패 상태 저장
          await db
            .update(crawlJobProducts)
            .set({
              status: "failed",
              errorMessage:
                error instanceof Error ? error.message : "Unknown error",
              processedAt: new Date(),
            })
            .where(eq(crawlJobProducts.id, jobProduct.id));
        }
      }

      // 작업 완료 처리
      await db
        .update(crawlJobs)
        .set({
          status: "completed",
          progress: 100,
          processedProducts: processedCount,
          completedAt: new Date(),
        })
        .where(eq(crawlJobs.id, jobId));

      console.log(
        `[CrawlerManager] Crawl job ${jobId} completed: ${processedCount}/${totalCount} products processed`
      );
    } catch (error) {
      console.error(`[CrawlerManager] Crawl job ${jobId} failed:`, error);

      // 작업 실패 처리
      await db
        .update(crawlJobs)
        .set({
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        })
        .where(eq(crawlJobs.id, jobId));

      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private async saveCrawlResult(
    crawlJobProductId: number,
    result: CrawlResult
  ): Promise<void> {
    try {
      if (result.success && result.price) {
        // 가격 히스토리 저장
        await db.insert(priceHistory).values({
          productId: result.productId,
          price: result.price.toString(),
          isAvailable: result.isAvailable,
          checkedAt: result.lastUpdated,
        });

        // 상품 정보 업데이트
        await db
          .update(products)
          .set({
            currentPrice: result.price.toString(),
            lastChecked: result.lastUpdated,
            updatedAt: new Date(),
          })
          .where(eq(products.id, result.productId));

        // 가격 변동 알림 체크
        await this.checkPriceAlert(result.productId, result.price);

        // 성공 상태 저장
        await db
          .update(crawlJobProducts)
          .set({
            status: "completed",
            processedAt: new Date(),
          })
          .where(eq(crawlJobProducts.id, crawlJobProductId));

        console.log(
          `[CrawlerManager] Saved crawl result for product ${result.productId}: price=${result.price}, available=${result.isAvailable}`
        );
      } else {
        // 실패 상태 저장
        await db
          .update(crawlJobProducts)
          .set({
            status: "failed",
            errorMessage: result.error?.message || "Crawl failed",
            processedAt: new Date(),
          })
          .where(eq(crawlJobProducts.id, crawlJobProductId));

        console.log(
          `[CrawlerManager] Crawl failed for product ${result.productId}: ${result.error?.message}`
        );
      }
    } catch (error) {
      console.error(`[CrawlerManager] Failed to save crawl result:`, error);
      throw error;
    }
  }

  private async checkPriceAlert(
    productId: number,
    currentPrice: number
  ): Promise<void> {
    try {
      // 상품의 목표 가격 조회
      const [product] = await db
        .select({
          name: products.name,
          targetPrice: products.targetPrice,
        })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product || !product.targetPrice) {
        return;
      }

      const targetPrice = parseFloat(product.targetPrice);

      // 목표가 이하로 떨어진 경우 알림 생성
      if (currentPrice <= targetPrice) {
        await db.insert(notifications).values({
          productId,
          type: "target_reached",
          title: "목표가 달성!",
          message: `${product.name}이 목표가 ${targetPrice.toLocaleString()}원 이하로 떨어졌습니다. 현재가: ${currentPrice.toLocaleString()}원`,
          isRead: false,
        });

        console.log(
          `[CrawlerManager] Price alert created for product ${productId}: target=${targetPrice}, current=${currentPrice}`
        );
      }
    } catch (error) {
      console.error(`[CrawlerManager] Failed to check price alert:`, error);
    }
  }

  async crawlSingleProduct(productId: number): Promise<CrawlResult> {
    try {
      const [product] = await db
        .select({
          id: products.id,
          name: products.name,
          storeUrl: products.storeUrl,
        })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      const target: CrawlTarget = {
        id: product.id,
        name: product.name,
        url: product.storeUrl,
      };

      const result = await this.crawler.crawl(target);

      // 단일 상품 크롤링 결과도 저장
      if (result.success && result.price) {
        await db.insert(priceHistory).values({
          productId: result.productId,
          price: result.price.toString(),
          isAvailable: result.isAvailable,
          checkedAt: result.lastUpdated,
        });

        await db
          .update(products)
          .set({
            currentPrice: result.price.toString(),
            lastChecked: result.lastUpdated,
            updatedAt: new Date(),
          })
          .where(eq(products.id, result.productId));

        await this.checkPriceAlert(result.productId, result.price);
      }

      return result;
    } catch (error) {
      console.error(
        `[CrawlerManager] Failed to crawl single product ${productId}:`,
        error
      );
      throw error;
    }
  }

  private delay(min: number, max: number): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  async close(): Promise<void> {
    await this.crawler.close();
  }

  getStatus(): { isRunning: boolean } {
    return { isRunning: this.isRunning };
  }
}

// 싱글톤 인스턴스
export const crawlerManager = new CrawlerManager();
