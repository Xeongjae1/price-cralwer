import cron from "node-cron";
import { db, products, crawlJobs } from "@repo/database";
import { eq } from "drizzle-orm";
import { crawlerManager } from "../crawler/manager.js";

export interface ScheduleConfig {
  id: string;
  name: string;
  pattern: string; // cron pattern
  productIds?: number[];
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export class SchedulerService {
  private schedules: Map<
    string,
    { config: ScheduleConfig; task: cron.ScheduledTask }
  > = new Map();

  constructor() {
    this.initializeDefaultSchedules();
  }

  private initializeDefaultSchedules(): void {
    // 기본 스케줄들 설정
    const defaultSchedules: ScheduleConfig[] = [
      {
        id: "daily-all-products",
        name: "전체 상품 일일 크롤링",
        pattern: "0 9 * * *", // 매일 오전 9시
        isActive: true,
      },
      {
        id: "hourly-active-products",
        name: "활성 상품 시간별 크롤링",
        pattern: "0 */2 * * *", // 2시간마다
        isActive: false,
      },
      {
        id: "weekly-deep-crawl",
        name: "주간 전체 크롤링",
        pattern: "0 2 * * 0", // 매주 일요일 새벽 2시
        isActive: true,
      },
    ];

    defaultSchedules.forEach((schedule) => {
      this.addSchedule(schedule);
    });

    console.log(
      `[Scheduler] Initialized ${defaultSchedules.length} default schedules`
    );
  }

  addSchedule(config: ScheduleConfig): void {
    if (this.schedules.has(config.id)) {
      this.removeSchedule(config.id);
    }

    const task = cron.schedule(
      config.pattern,
      async () => {
        await this.executeSchedule(config);
      },
      {
        scheduled: config.isActive,
        timezone: "Asia/Seoul",
      }
    );

    // 다음 실행 시간 계산
    config.nextRun = this.getNextRunDate(config.pattern);

    this.schedules.set(config.id, { config, task });

    console.log(
      `[Scheduler] Added schedule: ${config.name} (${config.pattern})`
    );
    if (config.nextRun) {
      console.log(
        `[Scheduler] Next run: ${config.nextRun.toLocaleString("ko-KR")}`
      );
    }
  }

  removeSchedule(id: string): void {
    const schedule = this.schedules.get(id);
    if (schedule) {
      schedule.task.stop();
      schedule.task.destroy();
      this.schedules.delete(id);
      console.log(`[Scheduler] Removed schedule: ${id}`);
    }
  }

  updateSchedule(id: string, updates: Partial<ScheduleConfig>): void {
    const schedule = this.schedules.get(id);
    if (schedule) {
      const updatedConfig = { ...schedule.config, ...updates };
      this.removeSchedule(id);
      this.addSchedule(updatedConfig);
    }
  }

  toggleSchedule(id: string): void {
    const schedule = this.schedules.get(id);
    if (schedule) {
      if (schedule.config.isActive) {
        schedule.task.stop();
        schedule.config.isActive = false;
      } else {
        schedule.task.start();
        schedule.config.isActive = true;
        schedule.config.nextRun = this.getNextRunDate(schedule.config.pattern);
      }
      console.log(
        `[Scheduler] Toggled schedule ${id}: ${schedule.config.isActive ? "ACTIVE" : "INACTIVE"}`
      );
    }
  }

  private async executeSchedule(config: ScheduleConfig): Promise<void> {
    try {
      console.log(`[Scheduler] Executing schedule: ${config.name}`);
      config.lastRun = new Date();

      let productIds = config.productIds;

      // 특정 상품이 지정되지 않은 경우 활성 상품 모두 조회
      if (!productIds || productIds.length === 0) {
        const activeProducts = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.isActive, true));

        productIds = activeProducts.map((p) => p.id);
      }

      if (productIds.length === 0) {
        console.log(
          `[Scheduler] No products found for schedule: ${config.name}`
        );
        return;
      }

      // 크롤링 작업 생성
      const newCrawlJob = {
        status: "pending" as const,
        progress: 0,
        totalProducts: productIds.length,
        processedProducts: 0,
      };

      const [crawlJob] = await db
        .insert(crawlJobs)
        .values(newCrawlJob)
        .returning();

      console.log(
        `[Scheduler] Created crawl job ${crawlJob.id} for ${productIds.length} products`
      );

      // 비동기로 크롤링 실행
      crawlerManager.processCrawlJob(crawlJob.id).catch((error) => {
        console.error(`[Scheduler] Crawl job ${crawlJob.id} failed:`, error);
      });

      // 다음 실행 시간 업데이트
      config.nextRun = this.getNextRunDate(config.pattern);
    } catch (error) {
      console.error(
        `[Scheduler] Failed to execute schedule ${config.name}:`,
        error
      );
    }
  }

  private getNextRunDate(cronPattern: string): Date | undefined {
    try {
      // cron-parser 라이브러리가 있다면 사용, 없으면 대략적 계산
      const now = new Date();

      // 간단한 패턴 파싱 (정확하지 않음, 실제로는 cron-parser 사용 권장)
      if (cronPattern === "0 9 * * *") {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        return tomorrow;
      }

      if (cronPattern === "0 */2 * * *") {
        const next = new Date(now);
        next.setHours(Math.floor(now.getHours() / 2) * 2 + 2, 0, 0, 0);
        return next;
      }

      if (cronPattern === "0 2 * * 0") {
        const nextSunday = new Date(now);
        nextSunday.setDate(now.getDate() + (7 - now.getDay()));
        nextSunday.setHours(2, 0, 0, 0);
        return nextSunday;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  getAllSchedules(): ScheduleConfig[] {
    return Array.from(this.schedules.values()).map((s) => s.config);
  }

  getSchedule(id: string): ScheduleConfig | undefined {
    return this.schedules.get(id)?.config;
  }

  getActiveSchedules(): ScheduleConfig[] {
    return this.getAllSchedules().filter((s) => s.isActive);
  }

  stopAll(): void {
    this.schedules.forEach((schedule, id) => {
      schedule.task.stop();
      console.log(`[Scheduler] Stopped schedule: ${id}`);
    });
  }

  startAll(): void {
    this.schedules.forEach((schedule, id) => {
      if (schedule.config.isActive) {
        schedule.task.start();
        console.log(`[Scheduler] Started schedule: ${id}`);
      }
    });
  }
}

// 싱글톤 인스턴스
export const schedulerService = new SchedulerService();
