import puppeteer, { Browser, Page, PuppeteerLaunchOptions } from "puppeteer";
import { BrowserConfig } from "../types/index";

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
];

export class BrowserManager {
  private browser: Browser | null = null;
  private pages: Set<Page> = new Set();
  private config: BrowserConfig;

  constructor(config: BrowserConfig) {
    this.config = config;
  }

  async launch(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    const launchOptions: PuppeteerLaunchOptions = {
      headless: this.config.headless ? "new" : false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-features=VizDisplayCompositor",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-web-security",
        "--disable-features=TranslateUI",
        "--disable-extensions",
        "--disable-component-extensions-with-background-pages",
        "--disable-ipc-flooding-protection",
        "--memory-pressure-off",
        "--max_old_space_size=4096",
      ],
      timeout: this.config.timeout || 30000,
      protocolTimeout: 30000,
      ignoreDefaultArgs: ["--disable-extensions"],
    };

    // 프록시 설정
    if (this.config.proxy) {
      launchOptions.args?.push(`--proxy-server=${this.config.proxy.server}`);
    }

    this.browser = await puppeteer.launch(launchOptions);

    // 브라우저 종료시 정리
    this.browser.on("disconnected", () => {
      this.browser = null;
      this.pages.clear();
    });

    return this.browser;
  }

  async createPage(): Promise<Page> {
    const browser = await this.launch();
    const page = await browser.newPage();

    // User Agent 설정
    const userAgent = this.config.userAgent || this.getRandomUserAgent();
    await page.setUserAgent(userAgent);

    // 뷰포트 설정
    if (this.config.viewport) {
      await page.setViewport(this.config.viewport);
    } else {
      await page.setViewport({ width: 1366, height: 768 });
    }

    // 프록시 인증
    if (this.config.proxy?.username && this.config.proxy?.password) {
      await page.authenticate({
        username: this.config.proxy.username,
        password: this.config.proxy.password,
      });
    }

    // 기본 설정
    await page.setJavaScriptEnabled(true);
    await page.setDefaultNavigationTimeout(this.config.timeout || 30000);
    await page.setDefaultTimeout(this.config.timeout || 30000);

    // 리소스 차단으로 속도 향상
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const resourceType = request.resourceType();

      // 불필요한 리소스 차단
      if (["stylesheet", "font", "image", "media"].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // 페이지 추가 헤더 설정
    await page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
    });

    this.pages.add(page);

    // 페이지 닫힐 때 Set에서 제거
    page.on("close", () => {
      this.pages.delete(page);
    });

    return page;
  }

  async closePage(page: Page): Promise<void> {
    if (!page.isClosed()) {
      await page.close();
    }
    this.pages.delete(page);
  }

  async close(): Promise<void> {
    // 모든 페이지 닫기
    for (const page of this.pages) {
      if (!page.isClosed()) {
        await page.close();
      }
    }
    this.pages.clear();

    // 브라우저 닫기
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  isHealthy(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }

  getPageCount(): number {
    return this.pages.size;
  }
}
