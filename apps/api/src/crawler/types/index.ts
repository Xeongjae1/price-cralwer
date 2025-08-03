export interface CrawlTarget {
  id: number;
  name: string;
  url: string;
  selector?: string;
  expectedPrice?: number;
}

export interface CrawlResult {
  productId: number;
  success: boolean;
  price?: number;
  originalPrice?: number;
  isAvailable: boolean;
  title?: string;
  imageUrl?: string;
  lastUpdated: Date;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  metadata?: {
    crawlDuration: number;
    retryCount: number;
    userAgent: string;
    proxyUsed?: string;
  };
}

export interface BrowserConfig {
  headless: boolean;
  userAgent?: string;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  viewport?: {
    width: number;
    height: number;
  };
  timeout?: number;
}

export interface CrawlerOptions {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  concurrency: number;
  respectRobotsTxt: boolean;
  minDelay: number;
  maxDelay: number;
  userAgentRotation: boolean;
  proxyRotation: boolean;
}

export enum CrawlErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  PARSE_ERROR = "PARSE_ERROR",
  BLOCKED_ERROR = "BLOCKED_ERROR",
  NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
  CAPTCHA_ERROR = "CAPTCHA_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
}
