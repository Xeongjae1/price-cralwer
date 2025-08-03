import {
  db,
  crawlJobs,
  crawlJobProducts,
  products,
  type CrawlJob,
  type NewCrawlJob,
} from "@repo/database";
import { eq, and, inArray } from "drizzle-orm";
import { crawlerManager } from "../crawler/manager";

export interface CrawlJobWithDetails extends CrawlJob {
  products?: Array<{
    id: number;
    name: string;
    storeUrl: string;
    status: string;
    errorMessage?: string;
    processedAt?: Date;
  }>;
}

export class CrawlService {
  async startCrawlJob(productIds: number[]): Promise<CrawlJob> {
    // 유효한 상품 ID 확인
    const validProducts = await db
      .select()
      .from(products)
      .where(
        and(inArray(products.id, productIds), eq(products.isActive, true))
      );

    if (validProducts.length === 0) {
      throw new Error("No valid active products found");
    }

    // 크롤링 작업 생성
    const newCrawlJob: NewCrawlJob = {
      status: "pending",
      progress: 0,
      totalProducts: validProducts.length,
      processedProducts: 0,
    };

    const [crawlJob] = await db
      .insert(crawlJobs)
      .values(newCrawlJob)
      .returning();

    // 크롤링 작업-상품 관계 생성
    const crawlJobProductsData = validProducts.map((product) => ({
      crawlJobId: crawlJob.id,
      productId: product.id,
      status: "pending",
    }));

    await db.insert(crawlJobProducts).values(crawlJobProductsData);

    // 비동기로 크롤링 실행
    this.processCrawlJobAsync(crawlJob.id);

    return crawlJob;
  }

  async startSingleProductCrawl(productId: number): Promise<any> {
    try {
      const result = await crawlerManager.crawlSingleProduct(productId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error(`Failed to crawl single product ${productId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async processCrawlJobAsync(jobId: number): Promise<void> {
    try {
      await crawlerManager.processCrawlJob(jobId);
    } catch (error) {
      console.error(`Crawl job ${jobId} failed:`, error);
    }
  }

  async getCrawlJobStatus(jobId: number): Promise<CrawlJobWithDetails | null> {
    const [crawlJob] = await db
      .select()
      .from(crawlJobs)
      .where(eq(crawlJobs.id, jobId))
      .limit(1);

    if (!crawlJob) return null;

    // 관련 상품 정보 조회
    const jobProducts = await db
      .select({
        id: products.id,
        name: products.name,
        storeUrl: products.storeUrl,
        status: crawlJobProducts.status,
        errorMessage: crawlJobProducts.errorMessage,
        processedAt: crawlJobProducts.processedAt,
      })
      .from(crawlJobProducts)
      .innerJoin(products, eq(crawlJobProducts.productId, products.id))
      .where(eq(crawlJobProducts.crawlJobId, jobId));

    return {
      ...crawlJob,
      products: jobProducts,
    };
  }

  async getAllCrawlJobs(limit: number = 10) {
    return await db
      .select()
      .from(crawlJobs)
      .orderBy(crawlJobs.createdAt)
      .limit(limit);
  }

  getCrawlerStatus(): { isRunning: boolean } {
    return crawlerManager.getStatus();
  }
}

export const crawlService = new CrawlService();
