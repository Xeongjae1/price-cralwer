import { BrowserManager } from "../utils/browser";
import { RetryManager } from "../utils/retry";
import {
  CrawlTarget,
  CrawlResult,
  BrowserConfig,
  CrawlerOptions,
} from "../types/index";

export abstract class BaseCrawler {
  protected browserManager: BrowserManager;
  protected retryManager: RetryManager;
  protected options: CrawlerOptions;

  constructor(browserConfig: BrowserConfig, crawlerOptions: CrawlerOptions) {
    this.browserManager = new BrowserManager(browserConfig);
    this.retryManager = new RetryManager({
      maxRetries: crawlerOptions.maxRetries,
      baseDelay: crawlerOptions.retryDelay,
      maxDelay: crawlerOptions.retryDelay * 8,
      exponentialBackoff: true,
      jitter: true,
    });
    this.options = crawlerOptions;
  }

  abstract crawl(target: CrawlTarget): Promise<CrawlResult>;
  abstract validateUrl(url: string): boolean;

  protected async delay(min?: number, max?: number): Promise<void> {
    const minDelay = min || this.options.minDelay;
    const maxDelay = max || this.options.maxDelay;
    const delay = Math.random() * (maxDelay - minDelay) + minDelay;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  async close(): Promise<void> {
    await this.browserManager.close();
  }
}
