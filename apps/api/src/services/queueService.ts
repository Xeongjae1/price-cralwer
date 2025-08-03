import { Queue, Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { crawlerManager } from "../crawler/manager.js";

// 작업 타입 정의
export interface CrawlJobData {
  jobId: number;
  productIds: number[];
  priority?: number;
  attempts?: number;
}

export interface SingleCrawlJobData {
  productId: number;
  priority?: number;
}

export class QueueService {
  private redis: Redis;
  private crawlQueue: Queue;
  private singleCrawlQueue: Queue;
  private crawlWorker: Worker;
  private singleCrawlWorker: Worker;

  constructor() {
    // Redis 연결
    this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
    });

    // 큐 초기화
    this.crawlQueue = new Queue("crawl-jobs", {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100, // 완료된 작업 100개까지 보관
        removeOnFail: 50, // 실패한 작업 50개까지 보관
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });

    this.singleCrawlQueue = new Queue("single-crawl-jobs", {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    });

    // 워커 초기화
    this.crawlWorker = new Worker(
      "crawl-jobs",
      this.processCrawlJob.bind(this),
      {
        connection: this.redis,
        concurrency: 1, // 동시에 하나의 크롤링 작업만 실행
      }
    );

    this.singleCrawlWorker = new Worker(
      "single-crawl-jobs",
      this.processSingleCrawlJob.bind(this),
      {
        connection: this.redis,
        concurrency: 3, // 단일 상품은 동시에 3개까지
      }
    );

    this.setupEventListeners();
  }

  // 배치 크롤링 작업 추가
  async addCrawlJob(
    data: CrawlJobData,
    options?: {
      priority?: number;
      delay?: number;
    }
  ): Promise<Job<CrawlJobData>> {
    return await this.crawlQueue.add("crawl-batch", data, {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
    });
  }

  // 단일 상품 크롤링 작업 추가
  async addSingleCrawlJob(
    data: SingleCrawlJobData,
    options?: {
      priority?: number;
      delay?: number;
    }
  ): Promise<Job<SingleCrawlJobData>> {
    return await this.singleCrawlQueue.add("crawl-single", data, {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
    });
  }

  // 배치 크롤링 작업 처리
  private async processCrawlJob(job: Job<CrawlJobData>): Promise<void> {
    const { jobId, productIds } = job.data;

    try {
      console.log(
        `[Queue] Processing crawl job ${jobId} with ${productIds.length} products`
      );

      // 진행상황 업데이트
      await job.updateProgress(0);

      // 크롤링 실행
      await crawlerManager.processCrawlJob(jobId);

      await job.updateProgress(100);
      console.log(`[Queue] Completed crawl job ${jobId}`);
    } catch (error) {
      console.error(`[Queue] Failed crawl job ${jobId}:`, error);
      throw error;
    }
  }

  // 단일 상품 크롤링 작업 처리
  private async processSingleCrawlJob(
    job: Job<SingleCrawlJobData>
  ): Promise<any> {
    const { productId } = job.data;

    try {
      console.log(`[Queue] Processing single crawl for product ${productId}`);

      await job.updateProgress(0);

      const result = await crawlerManager.crawlSingleProduct(productId);

      await job.updateProgress(100);
      console.log(`[Queue] Completed single crawl for product ${productId}`);

      return result;
    } catch (error) {
      console.error(
        `[Queue] Failed single crawl for product ${productId}:`,
        error
      );
      throw error;
    }
  }

  // 이벤트 리스너 설정
  private setupEventListeners(): void {
    // 배치 크롤링 큐 이벤트
    this.crawlQueue.on("completed", (job) => {
      console.log(`[Queue] Crawl job ${job.id} completed`);
    });

    this.crawlQueue.on("failed", (job, err) => {
      console.error(`[Queue] Crawl job ${job?.id} failed:`, err.message);
    });

    // 단일 크롤링 큐 이벤트
    this.singleCrawlQueue.on("completed", (job) => {
      console.log(`[Queue] Single crawl job ${job.id} completed`);
    });

    this.singleCrawlQueue.on("failed", (job, err) => {
      console.error(`[Queue] Single crawl job ${job?.id} failed:`, err.message);
    });

    // 워커 이벤트
    this.crawlWorker.on("ready", () => {
      console.log("[Queue] Crawl worker is ready");
    });

    this.singleCrawlWorker.on("ready", () => {
      console.log("[Queue] Single crawl worker is ready");
    });
  }

  // 큐 상태 조회
  async getQueueStats(): Promise<{
    crawlQueue: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
    singleCrawlQueue: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
  }> {
    const [crawlWaiting, crawlActive, crawlCompleted, crawlFailed] =
      await Promise.all([
        this.crawlQueue.getWaiting(),
        this.crawlQueue.getActive(),
        this.crawlQueue.getCompleted(),
        this.crawlQueue.getFailed(),
      ]);

    const [singleWaiting, singleActive, singleCompleted, singleFailed] =
      await Promise.all([
        this.singleCrawlQueue.getWaiting(),
        this.singleCrawlQueue.getActive(),
        this.singleCrawlQueue.getCompleted(),
        this.singleCrawlQueue.getFailed(),
      ]);

    return {
      crawlQueue: {
        waiting: crawlWaiting.length,
        active: crawlActive.length,
        completed: crawlCompleted.length,
        failed: crawlFailed.length,
      },
      singleCrawlQueue: {
        waiting: singleWaiting.length,
        active: singleActive.length,
        completed: singleCompleted.length,
        failed: singleFailed.length,
      },
    };
  }

  // 큐 정리
  async clearQueue(queueName: "crawl" | "single" | "all"): Promise<void> {
    if (queueName === "crawl" || queueName === "all") {
      await this.crawlQueue.drain();
      await this.crawlQueue.clean(0, "completed");
      await this.crawlQueue.clean(0, "failed");
    }

    if (queueName === "single" || queueName === "all") {
      await this.singleCrawlQueue.drain();
      await this.singleCrawlQueue.clean(0, "completed");
      await this.singleCrawlQueue.clean(0, "failed");
    }

    console.log(`[Queue] Cleared ${queueName} queue(s)`);
  }

  // 우아한 종료
  async close(): Promise<void> {
    await this.crawlWorker.close();
    await this.singleCrawlWorker.close();
    await this.crawlQueue.close();
    await this.singleCrawlQueue.close();
    await this.redis.quit();
    console.log("[Queue] All queues and workers closed");
  }
}

// 싱글톤 인스턴스
export const queueService = new QueueService();
