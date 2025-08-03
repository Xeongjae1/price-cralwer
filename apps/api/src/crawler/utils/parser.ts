import { Page } from "puppeteer";

export interface ParsedProduct {
  name?: string;
  price?: number;
  originalPrice?: number;
  isAvailable: boolean;
  imageUrl?: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  seller?: string;
}

export class SmartStoreParser {
  async parseProductPage(page: Page, url: string): Promise<ParsedProduct> {
    try {
      // 페이지 로드 대기
      await page.waitForLoadState("networkidle");

      // 스마트스토어 선택자들 (2025년 최신)
      const selectors = {
        // 가격 관련
        price: [
          ".price_num .num", // 현재 가격
          ".price_area .num", // 가격 영역
          ".product_price .num", // 상품 가격
          ".total_price .num", // 총 가격
          ".sale_price .num", // 할인 가격
          '[data-testid="price"] .num', // 새로운 데이터 속성
          ".ProductPrice .num", // 컴포넌트 기반
        ],

        // 원가 (할인 전 가격)
        originalPrice: [
          ".price_detail .origin .num", // 원래 가격
          ".origin_price .num", // 정가
          ".before_price .num", // 할인 전 가격
          '[data-testid="original-price"] .num', // 새로운 데이터 속성
        ],

        // 상품명
        title: [
          ".product_title h1", // 상품 제목
          ".product_info .title", // 상품 정보 제목
          ".item_title h1", // 아이템 제목
          '[data-testid="product-title"]', // 새로운 데이터 속성
          ".ProductTitle", // 컴포넌트 기반
        ],

        // 재고/구매 가능 여부
        availability: [
          ".product_option_area", // 옵션 영역
          ".btn_buy", // 구매 버튼
          ".option_box", // 옵션 박스
          ".soldout", // 품절 표시
          '[data-testid="buy-button"]', // 구매 버튼
        ],

        // 이미지
        image: [
          ".product_img img", // 상품 이미지
          ".detail_img img", // 상세 이미지
          ".thumb_img img", // 썸네일 이미지
          '[data-testid="product-image"]', // 새로운 데이터 속성
        ],

        // 판매자
        seller: [
          ".seller_info .name", // 판매자 정보
          ".store_name", // 스토어명
          ".shop_name", // 샵명
          '[data-testid="seller-name"]', // 새로운 데이터 속성
        ],
      };

      const result: ParsedProduct = {
        isAvailable: true,
      };

      // 가격 파싱
      result.price = await this.extractPrice(page, selectors.price);
      result.originalPrice = await this.extractPrice(
        page,
        selectors.originalPrice
      );

      // 상품명 파싱
      result.name = await this.extractText(page, selectors.title);

      // 이미지 URL 파싱
      result.imageUrl = await this.extractImageUrl(page, selectors.image);

      // 판매자 파싱
      result.seller = await this.extractText(page, selectors.seller);

      // 재고 상태 확인
      result.isAvailable = await this.checkAvailability(
        page,
        selectors.availability
      );

      return result;
    } catch (error) {
      console.error("Parse error:", error);
      throw new Error(`Failed to parse product page: ${error.message}`);
    }
  }

  private async extractPrice(
    page: Page,
    selectors: string[]
  ): Promise<number | undefined> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text) {
            // 가격 텍스트에서 숫자만 추출
            const price = this.parsePrice(text);
            if (price > 0) {
              return price;
            }
          }
        }
      } catch (error) {
        // 다음 선택자 시도
        continue;
      }
    }
    return undefined;
  }

  private async extractText(
    page: Page,
    selectors: string[]
  ): Promise<string | undefined> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch (error) {
        continue;
      }
    }
    return undefined;
  }

  private async extractImageUrl(
    page: Page,
    selectors: string[]
  ): Promise<string | undefined> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const src = await element.getAttribute("src");
          if (src) {
            // 상대 URL을 절대 URL로 변환
            return new URL(src, page.url()).href;
          }
        }
      } catch (error) {
        continue;
      }
    }
    return undefined;
  }

  private async checkAvailability(
    page: Page,
    selectors: string[]
  ): Promise<boolean> {
    try {
      // 품절 관련 텍스트 체크
      const pageContent = await page.textContent("body");
      const unavailableKeywords = [
        "품절",
        "soldout",
        "sold out",
        "재고없음",
        "구매불가",
        "판매종료",
        "일시중단",
        "품절상품",
      ];

      if (pageContent) {
        const lowerContent = pageContent.toLowerCase();
        const hasUnavailableKeyword = unavailableKeywords.some((keyword) =>
          lowerContent.includes(keyword.toLowerCase())
        );

        if (hasUnavailableKeyword) {
          return false;
        }
      }

      // 구매 버튼 존재 여부 확인
      for (const selector of selectors) {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            return true;
          }
        }
      }

      return true; // 기본적으로 구매 가능으로 판단
    } catch (error) {
      return true; // 에러 시 기본값
    }
  }

  private parsePrice(priceText: string): number {
    // 가격 텍스트에서 숫자만 추출
    const cleanText = priceText
      .replace(/[^\d,]/g, "") // 숫자와 쉼표만 남김
      .replace(/,/g, ""); // 쉼표 제거

    const price = parseInt(cleanText, 10);
    return isNaN(price) ? 0 : price;
  }
}

// Playwright 호환성을 위한 확장
declare module "puppeteer" {
  interface Page {
    waitForLoadState(
      state: "load" | "domcontentloaded" | "networkidle"
    ): Promise<void>;
  }
}

// waitForLoadState 폴리필 추가
Page.prototype.waitForLoadState = async function (
  state: "load" | "domcontentloaded" | "networkidle"
) {
  switch (state) {
    case "load":
      await this.waitForLoadState("load");
      break;
    case "domcontentloaded":
      await this.waitForLoadState("domcontentloaded");
      break;
    case "networkidle":
      await this.waitForLoadState("networkidle0");
      break;
  }
};
