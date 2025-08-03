import { Page } from "puppeteer";
import { BaseCrawler } from "./base";
import { SmartStoreParser } from "../utils/parser";
import { CrawlTarget, CrawlResult, CrawlErrorCode } from "../types/index";

export class SmartStoreCrawler extends BaseCrawler {
  private parser: SmartStoreParser;

  constructor(browserConfig: any, crawlerOptions: any) {
    super(browserConfig, crawlerOptions);
    this.parser = new SmartStoreParser();
  }

  validateUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return (
        parsedUrl.hostname.includes("smartstore.naver.com") ||
        parsedUrl.hostname.includes("brand.naver.com")
      );
    } catch {
      return false;
    }
  }

  async crawl(target: CrawlTarget): Promise<CrawlResult> {
    const startTime = Date.now();
    let retryCount = 0;
    let page: Page | null = null;

    const result: CrawlResult = {
      productId: target.id,
      success: false,
      isAvailable: false,
      lastUpdated: new Date(),
      metadata: {
        crawlDuration: 0,
        retryCount: 0,
        userAgent: "",
      },
    };

    try {
      if (!this.validateUrl(target.url)) {
        throw new Error(`Invalid SmartStore URL: ${target.url}`);
      }

      const crawlOperation = async (): Promise<CrawlResult> => {
        page = await this.browserManager.createPage();
        result.metadata!.userAgent = await page.evaluate(
          () => navigator.userAgent
        );

        console.log(
          `[Crawler] Starting crawl for product ${target.id}: ${target.name}`
        );

        // 랜덤 지연
        await this.delay();

        // 페이지 이동
        console.log(`[Crawler] Navigating to: ${target.url}`);
        const response = await page.goto(target.url, {
          waitUntil: "networkidle2",
          timeout: this.options.timeout,
        });

        if (!response) {
          throw new Error("Failed to load page - no response received");
        }

        // HTTP 상태 코드 확인
        const status = response.status();
        if (status >= 400) {
          if (status === 404) {
            throw new Error(`Product not found (404): ${target.url}`);
          } else if (status === 403) {
            throw new Error(
              `Access forbidden (403) - possibly blocked: ${target.url}`
            );
          } else {
            throw new Error(`HTTP error ${status}: ${target.url}`);
          }
        }

        // 페이지 로딩 완료 대기
        await page.waitForSelector("body", { timeout: 10000 });

        // CAPTCHA 감지
        const hasCaptcha = await this.detectCaptcha(page);
        if (hasCaptcha) {
          throw new Error("CAPTCHA detected - crawling blocked");
        }

        // 차단 페이지 감지
        const isBlocked = await this.detectBlocking(page);
        if (isBlocked) {
          throw new Error("Access blocked by website");
        }

        // 상품 데이터 파싱
        console.log(`[Crawler] Parsing product data for ${target.id}`);
        const productData = await this.parser.parseProductPage(
          page,
          target.url
        );

        // 결과 구성
        result.success = true;
        result.price = productData.price;
        result.originalPrice = productData.originalPrice;
        result.isAvailable = productData.isAvailable;
        result.title = productData.name;
        result.imageUrl = productData.imageUrl;

        console.log(
          `[Crawler] Successfully crawled product ${target.id}: Price=${result.price}, Available=${result.isAvailable}`
        );

        return result;
      };

      // 재시도 로직으로 크롤링 실행
      const finalResult = await this.retryManager.execute(
        crawlOperation,
        `SmartStore crawl for product ${target.id}`
      );

      return finalResult;
    } catch (error) {
      console.error(`[Crawler] Failed to crawl product ${target.id}:`, error);

      result.success = false;
      result.error = {
        code: this.categorizeError(error as Error),
        message: (error as Error).message,
        stack: (error as Error).stack,
      };

      return result;
    } finally {
      // 메타데이터 설정
      result.metadata!.crawlDuration = Date.now() - startTime;
      result.metadata!.retryCount = retryCount;

      // 페이지 정리
      if (page) {
        try {
          await this.browserManager.closePage(page);
        } catch (closeError) {
          console.error("[Crawler] Error closing page:", closeError);
        }
      }
    }
  }

  private async detectCaptcha(page: Page): Promise<boolean> {
    try {
      const captchaSelectors = [
        ".captcha",
        "#captcha",
        '[data-testid="captcha"]',
        ".g-recaptcha",
        ".h-captcha",
        'iframe[src*="recaptcha"]',
        'iframe[src*="hcaptcha"]',
      ];

      for (const selector of captchaSelectors) {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            return true;
          }
        }
      }

      // 텍스트 기반 CAPTCHA 감지
      const pageText = await page.textContent("body");
      if (pageText) {
        const captchaKeywords = [
          "자동입력 방지",
          "captcha",
          "보안문자",
          "자동접속 차단",
          "automation detected",
        ];

        return captchaKeywords.some((keyword) =>
          pageText.toLowerCase().includes(keyword.toLowerCase())
        );
      }

      return false;
    } catch {
      return false;
    }
  }

  private async detectBlocking(page: Page): Promise<boolean> {
    try {
      const pageText = await page.textContent("body");
      if (pageText) {
        const blockingKeywords = [
          "접속이 차단",
          "access denied",
          "blocked",
          "비정상적인 접근",
          "일시적으로 차단",
          "too many requests",
          "rate limit",
        ];

        return blockingKeywords.some((keyword) =>
          pageText.toLowerCase().includes(keyword.toLowerCase())
        );
      }

      return false;
    } catch {
      return false;
    }
  }

  private categorizeError(error: Error): CrawlErrorCode {
    const message = error.message.toLowerCase();

    if (message.includes("timeout") || message.includes("navigation timeout")) {
      return CrawlErrorCode.TIMEOUT_ERROR;
    }

    if (message.includes("captcha")) {
      return CrawlErrorCode.CAPTCHA_ERROR;
    }

    if (
      message.includes("blocked") ||
      message.includes("forbidden") ||
      message.includes("403")
    ) {
      return CrawlErrorCode.BLOCKED_ERROR;
    }

    if (message.includes("404") || message.includes("not found")) {
      return CrawlErrorCode.NOT_FOUND_ERROR;
    }

    if (
      message.includes("rate limit") ||
      message.includes("too many requests")
    ) {
      return CrawlErrorCode.RATE_LIMIT_ERROR;
    }

    if (message.includes("parse") || message.includes("parsing")) {
      return CrawlErrorCode.PARSE_ERROR;
    }

    return CrawlErrorCode.NETWORK_ERROR;
  }
}
