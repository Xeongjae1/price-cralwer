import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { monitoringService } from '../services/monitoringService.js';

const monitoringRoutes: FastifyPluginAsync = async (fastify) => {
  // 시스템 통계 조회
  fastify.get('/monitoring/stats', {
    schema: {
      tags: ['Monitoring'],
      summary: 'Get system statistics',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({
            totalProducts: Type.Number(),
            activeProducts: Type.Number(),
            totalPriceChecks: Type.Number(),
            successfulCrawls: Type.Number(),
            failedCrawls: Type.Number(),
            averagePrice: Type.Number(),
            priceAlerts: Type.Number(),
            lastCrawlTime: Type.Optional(Type.String({ format: 'date-time' }))
          })
        })
      }
    }
  }, async (request, reply) => {
    try {
      const stats = await monitoringService.getSystemStats();
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to get system statistics'
      };
    }
  });

  // 가격 알림 체크
  fastify.post('/monitoring/check-alerts', {
    schema: {
      tags: ['Monitoring'],
      summary: 'Check for price alerts',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Array(Type.Object({
            productId: Type.Number(),
            productName: Type.String(),
            currentPrice: Type.Number(),
            previousPrice: Type.Optional(Type.Number()),
            targetPrice: Type.Optional(Type.Number()),
            priceChange: Type.Number(),
            priceChangePercent: Type.Number(),
            alertType: Type.String()
          })),
          message: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    try {
      const alerts = await monitoringService.checkPriceAlerts();
      
      return {
        success: true,
        data: alerts,
        message: `Found ${alerts.length} price alerts`
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500);
      return {
        success: false,
        error: 'Failed to check price alerts'
      };
    }
  });

  // 가격 트렌드 분석
  fastify.get('/monitoring/trends/:productId', {
    schema: {
      tags: ['Monitoring'],
      summary: 'Get price trend analysis for product',
      params: Type.Object({
        productId: Type.String({ pattern: '^[0-9]+# 고급 크롤링 기능 구현

## 1. 향상된 파싱 엔진

### 1.1 apps/api/src/crawler/utils/parser.ts 업데이트 (더 정확한 파싱)
```typescript
import { Page } from 'puppeteer';

export interface ParsedProduct {
  name?: string;
  price?: number;
  originalPrice?: number;
  discountRate?: number;
  isAvailable: boolean;
  imageUrl?: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  seller?: string;
  category?: string;
  shipping?: {
    free: boolean;
    fee?: number;
    estimatedDays?: number;
  };
  stock?: {
    available: boolean;
    quantity?: number;
    message?: string;
  };
}

export class SmartStoreParser {
  
  async parseProductPage(page: Page, url: string): Promise<ParsedProduct> {
    try {
      console.log(`[Parser] Starting to parse: ${url}`);
      
      // 페이지 로드 대기 및 안정화
      await this.waitForPageStable(page);
      
      // 2025년 최신 스마트스토어 선택자들
      const selectors = this.getLatestSelectors();

      const result: ParsedProduct = {
        isAvailable: true,
        shipping: { free: false },
        stock: { available: true }
      };

      // 병렬로 데이터 추출하여 성능 향상
      const [
        priceData,
        productInfo,
        availabilityData,
        shippingData,
        reviewData
      ] = await Promise.allSettled([
        this.extractPriceData(page, selectors),
        this.extractProductInfo(page, selectors),
        this.extractAvailabilityData(page, selectors),
        this.extractShippingData(page, selectors),
        this.extractReviewData(page, selectors)
      ]);

      // 결과 통합
      if (priceData.status === 'fulfilled') {
        Object.assign(result, priceData.value);
      }
      
      if (productInfo.status === 'fulfilled') {
        Object.assign(result, productInfo.value);
      }
      
      if (availabilityData.status === 'fulfilled') {
        Object.assign(result, availabilityData.value);
      }
      
      if (shippingData.status === 'fulfilled') {
        result.shipping = { ...result.shipping, ...shippingData.value };
      }
      
      if (reviewData.status === 'fulfilled') {
        Object.assign(result, reviewData.value);
      }

      // 할인율 계산
      if (result.price && result.originalPrice && result.originalPrice > result.price) {
        result.discountRate = Math.round(((result.originalPrice - result.price) / result.originalPrice) * 100);
      }

      console.log(`[Parser] Successfully parsed: ${result.name}, Price: ${result.price}, Available: ${result.isAvailable}`);
      return result;
      
    } catch (error) {
      console.error('[Parser] Parse error:', error);
      throw new Error(`Failed to parse product page: ${error.message}`);
    }
  }

  private async waitForPageStable(page: Page): Promise<void> {
    try {
      // 네트워크 안정화 대기
      await page.waitForLoadState('networkidle');
      
      // DOM 안정화 대기
      await page.waitForSelector('body', { timeout: 10000 });
      
      // JavaScript 렌더링 대기
      await page.waitForFunction(() => {
        return document.readyState === 'complete';
      }, { timeout: 10000 });
      
      // 추가 안정화 시간
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.warn('[Parser] Page stabilization warning:', error.message);
    }
  }

  private getLatestSelectors() {
    return {
      // 가격 관련 (2025년 최신)
      price: [
        '[data-testid="price-value"]',           // 최신 테스트 속성
        '.ProductPrice_price__value',            // 새 컴포넌트 구조
        '.price_num .blind',                     // 스크린 리더용 숨김 텍스트
        '.price_area .num',                      // 기존 가격 영역
        '.product_price .num',                   // 상품 가격
        '.sale_price .num',                      // 할인 가격
        '.total_price .num',                     // 총 가격
        '.ProductPrice .num',                    // 컴포넌트 기반
        '.price_detail .current .num',           // 현재 가격 상세
        '.option_price .num'                     // 옵션 가격
      ],
      
      originalPrice: [
        '[data-testid="original-price"]',        // 최신 테스트 속성
        '.ProductPrice_original__value',         // 새 컴포넌트 구조
        '.price_detail .origin .num',            // 원래 가격
        '.origin_price .num',                    // 정가
        '.before_price .num',                    // 할인 전 가격
        '.list_price .num',                      // 정가
        '.ProductPrice .origin .num'             // 컴포넌트 원가
      ],
      
      title: [
        '[data-testid="product-name"]',          // 최신 테스트 속성
        '.ProductTitle_title__text',             // 새 컴포넌트 구조
        '.product_title h1',                     // 상품 제목
        '.product_info .title',                  // 상품 정보 제목
        '.item_title h1',                        // 아이템 제목
        '.ProductTitle h1',                      // 컴포넌트 기반
        '.product_name',                         // 간단한 상품명
        '.goods_name'                            // 상품명
      ],
      
      availability: [
        '[data-testid="stock-status"]',          // 최신 재고 상태
        '.ProductStock_status',                  // 새 재고 컴포넌트
        '.product_option_area',                  // 옵션 영역
        '.btn_buy',                              // 구매 버튼
        '.option_box',                           // 옵션 박스
        '.soldout',                              // 품절 표시
        '.stock_info',                           // 재고 정보
        '.inventory_status'                      // 재고 상태
      ],
      
      seller: [
        '[data-testid="seller-info"]',           // 최신 판매자 정보
        '.SellerInfo_name',                      // 새 판매자 컴포넌트
        '.seller_info .name',                    // 판매자 정보
        '.store_name',                           // 스토어명
        '.shop_name',                            // 샵명
        '.brand_name',                           // 브랜드명
        '.seller_name'                           // 판매자명
      ],
      
      image: [
        '[data-testid="product-image"]',         // 최신 상품 이미지
        '.ProductImage_main img',                // 새 이미지 컴포넌트
        '.product_img img',                      // 상품 이미지
        '.detail_img img',                       // 상세 이미지
        '.thumb_img img',                        // 썸네일 이미지
        '.main_image img',                       // 메인 이미지
        '.goods_img img'                         // 상품 이미지
      ],
      
      shipping: [
        '[data-testid="shipping-info"]',         // 최신 배송 정보
        '.ShippingInfo_content',                 // 새 배송 컴포넌트
        '.delivery_info',                        // 배송 정보
        '.shipping_fee',                         // 배송비
        '.delivery_fee',                         // 배달비
        '.shipping_policy'                       // 배송 정책
      ],
      
      reviews: [
        '[data-testid="review-summary"]',        // 최신 리뷰 요약
        '.ReviewSummary_rating',                 // 새 리뷰 컴포넌트
        '.review_summary',                       // 리뷰 요약
        '.rating_area',                          // 평점 영역
        '.review_count',                         // 리뷰 수
        '.star_rating'                           // 별점
      ]
    };
  }

  private async extractPriceData(page: Page, selectors: any): Promise<Partial<ParsedProduct>> {
    const result: Partial<ParsedProduct> = {};
    
    // 현재 가격 추출
    result.price = await this.extractPrice(page, selectors.price);
    
    // 원가 추출
    result.originalPrice = await this.extractPrice(page, selectors.originalPrice);
    
    // 가격이 없으면 텍스트에서 추출 시도
    if (!result.price) {
      result.price = await this.extractPriceFromText(page);
    }
    
    return result;
  }

  private async extractProductInfo(page: Page, selectors: any): Promise<Partial<ParsedProduct>> {
    const result: Partial<ParsedProduct> = {};
    
    // 상품명
    result.name = await this.extractText(page, selectors.title);
    
    // 판매자
    result.seller = await this.extractText(page, selectors.seller);
    
    // 이미지
    result.imageUrl = await this.extractImageUrl(page, selectors.image);
    
    // 카테고리 (브레드크럼에서 추출)
    result.category = await this.extractCategory(page);
    
    return result;
  }

  private async extractAvailabilityData(page: Page, selectors: any): Promise<Partial<ParsedProduct>> {
    const result: Partial<ParsedProduct> = {
      stock: { available: true }
    };
    
    // 재고 상태 확인
    const availability = await this.checkAvailability(page, selectors.availability);
    result.isAvailable = availability.isAvailable;
    result.stock = availability.stock;
    
    return result;
  }

  private async extractShippingData(page: Page, selectors: any): Promise<any> {
    const shipping = { free: false };
    
    try {
      for (const selector of selectors.shipping) {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text) {
            const lowerText = text.toLowerCase();
            
            // 무료배송 체크
            if (lowerText.includes('무료') || lowerText.includes('free')) {
              shipping.free = true;
            }
            
            // 배송비 추출
            const feeMatch = text.match(/(\d+)원/);
            if (feeMatch && !shipping.free) {
              shipping.fee = parseInt(feeMatch[1]);
            }
            
            // 배송일 추출
            const dayMatch = text.match(/(\d+)일/);
            if (dayMatch) {
              shipping.estimatedDays = parseInt(dayMatch[1]);
            }
            
            break;
          }
        }
      }
    } catch (error) {
      console.warn('[Parser] Shipping data extraction warning:', error.message);
    }
    
    return shipping;
  }

  private async extractReviewData(page: Page, selectors: any): Promise<Partial<ParsedProduct>> {
    const result: Partial<ParsedProduct> = {};
    
    try {
      for (const selector of selectors.reviews) {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text) {
            // 평점 추출 (별점 4.5점 형태)
            const ratingMatch = text.match(/(\d+\.?\d*)[점★]/);
            if (ratingMatch) {
              result.rating = parseFloat(ratingMatch[1]);
            }
            
            // 리뷰 수 추출
            const reviewMatch = text.match(/(\d+)개|(\d+)건/);
            if (reviewMatch) {
              result.reviewCount = parseInt(reviewMatch[1] || reviewMatch[2]);
            }
            
            break;
          }
        }
      }
    } catch (error) {
      console.warn('[Parser] Review data extraction warning:', error.message);
    }
    
    return result;
  }

  private async extractPrice(page: Page, selectors: string[]): Promise<number | undefined> {
    for (const selector of selectors) {
      try {
        // 일반 선택자 시도
        let element = await page.$(selector);
        
        // data-testid가 있는 경우 더 구체적으로 찾기
        if (!element && selector.includes('data-testid')) {
          const testId = selector.match(/data-testid="([^"]+)"/)?.[1];
          if (testId) {
            element = await page.$(`[data-testid="${testId}"]`);
          }
        }
        
        if (element) {
          let text = await element.textContent();
          
          // 숨김 텍스트나 aria-label에서도 찾기
          if (!text || !text.trim()) {
            text = await element.getAttribute('aria-label') || 
                   await element.getAttribute('title') ||
                   await element.getAttribute('data-price');
          }
          
          if (text) {
            const price = this.parsePrice(text);
            if (price > 0) {
              return price;
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
    return undefined;
  }

  private async extractPriceFromText(page: Page): Promise<number | undefined> {
    try {
      // 페이지 전체 텍스트에서 가격 패턴 찾기
      const bodyText = await page.textContent('body');
      if (bodyText) {
        // 다양한 가격 패턴 시도
        const pricePatterns = [
          /(\d{1,3}(?:,\d{3})*)\s*원/g,  // 123,456원
          /₩\s*(\d{1,3}(?:,\d{3})*)/g,   // ₩123,456
          /(\d{4,})\s*원/g,              // 10000원 (쉼표 없음)
        ];
        
        for (const pattern of pricePatterns) {
          const matches = [...bodyText.matchAll(pattern)];
          const prices = matches
            .map(match => this.parsePrice(match[1]))
            .filter(price => price >= 1000 && price <= 10000000) // 합리적인 가격 범위
            .sort((a, b) => b - a); // 내림차순 정렬
          
          if (prices.length > 0) {
            return prices[0]; // 가장 높은 가격 (일반적으로 정가)
          }
        }
      }
    } catch (error) {
      console.warn('[Parser] Text price extraction warning:', error.message);
    }
    
    return undefined;
  }

  private async extractText(page: Page, selectors: string[]): Promise<string | undefined> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          let text = await element.textContent();
          
          // 제목의 경우 더 정제된 텍스트 추출
          if (!text && selector.includes('title')) {
            text = await element.getAttribute('title') ||
                   await element.getAttribute('alt');
          }
          
          if (text && text.trim()) {
            return this.cleanText(text.trim());
          }
        }
      } catch (error) {
        continue;
      }
    }
    return undefined;
  }

  private async extractImageUrl(page: Page, selectors: string[]): Promise<string | undefined> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          let src = await element.getAttribute('src') ||
                   await element.getAttribute('data-src') ||
                   await element.getAttribute('data-original');
          
          if (src) {
            // 상대 URL을 절대 URL로 변환
            if (src.startsWith('//')) {
              src = 'https:' + src;
            } else if (src.startsWith('/')) {
              src = new URL(src, page.url()).href;
            }
            
            // 썸네일이 아닌 원본 이미지 URL 추출
            src = this.getOriginalImageUrl(src);
            
            return src;
          }
        }
      } catch (error) {
        continue;
      }
    }
    return undefined;
  }

  private async extractCategory(page: Page): Promise<string | undefined> {
    try {
      const breadcrumbSelectors = [
        '.breadcrumb',
        '.path',
        '.category_path',
        '.navi_path',
        '[data-testid="breadcrumb"]'
      ];
      
      for (const selector of breadcrumbSelectors) {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text) {
            // 브레드크럼에서 마지막 카테고리 추출
            const categories = text.split('>').map(cat => cat.trim()).filter(Boolean);
            if (categories.length > 1) {
              return categories[categories.length - 1];
            }
          }
        }
      }
    } catch (error) {
      console.warn('[Parser] Category extraction warning:', error.message);
    }
    
    return undefined;
  }

  private async checkAvailability(page: Page, selectors: string[]): Promise<{
    isAvailable: boolean;
    stock: { available: boolean; quantity?: number; message?: string };
  }> {
    try {
      const pageContent = await page.textContent('body') || '';
      const lowerContent = pageContent.toLowerCase();
      
      // 품절 키워드 체크
      const unavailableKeywords = [
        '품절', 'soldout', 'sold out', '재고없음', 
        '구매불가', '판매종료', '일시중단', '품절상품',
        'out of stock', '재고 부족', '일시품절'
      ];
      
      const hasUnavailableKeyword = unavailableKeywords.some(keyword => 
        lowerContent.includes(keyword.toLowerCase())
      );
      
      if (hasUnavailableKeyword) {
        return {
          isAvailable: false,
          stock: { available: false, message: '품절' }
        };
      }

      // 재고 수량 확인
      const stockMatch = pageContent.match(/재고\s*(\d+)개?|(\d+)개\s*남음/);
      let stockQuantity;
      if (stockMatch) {
        stockQuantity = parseInt(stockMatch[1] || stockMatch[2]);
        if (stockQuantity === 0) {
          return {
            isAvailable: false,
            stock: { available: false, quantity: 0, message: '재고없음' }
          };
        }
      }

      // 구매 버튼 존재 여부 확인
      const buyButtonSelectors = [
        '.btn_buy',
        '.buy_button',
        '[data-testid="buy-button"]',
        '.purchase_btn',
        '.order_btn'
      ];
      
      for (const selector of buyButtonSelectors) {
        const button = await page.$(selector);
        if (button) {
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          
          if (isVisible && isEnabled) {
            return {
              isAvailable: true,
              stock: { 
                available: true, 
                quantity: stockQuantity,
                message: stockQuantity ? `재고 ${stockQuantity}개` : undefined
              }
            };
          }
        }
      }

      // 기본값: 구매 가능
      return {
        isAvailable: true,
        stock: { available: true, quantity: stockQuantity }
      };
      
    } catch (error) {
      console.warn('[Parser] Availability check warning:', error.message);
      return {
        isAvailable: true,
        stock: { available: true }
      };
    }
  }

  private parsePrice(priceText: string): number {
    // 가격 텍스트에서 숫자만 추출
    const cleanText = priceText
      .replace(/[^\d,]/g, '')  // 숫자와 쉼표만 남김
      .replace(/,/g, '');      // 쉼표 제거
    
    const price = parseInt(cleanText, 10);
    return isNaN(price) ? 0 : price;
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')     // 연속된 공백을 하나로
      .replace(/\n+/g, ' ')     // 개행을 공백으로
      .trim();
  }

  private getOriginalImageUrl(thumbnailUrl: string): string {
    // 스마트스토어 이미지 URL 패턴에 따라 원본 이미지 URL 생성
    return thumbnailUrl
      .replace(/\/[0-9]+x[0-9]+\//, '/original/')  // 크기 지정 제거
      .replace(/_small|_medium|_thumb/, '')       // 크기 접미사 제거
      .replace(/\?.*$/, '');                      // 쿼리 파라미터 제거
  }
}

// Puppeteer Page 확장 (waitForLoadState 폴리필)
declare module 'puppeteer' {
  interface Page {
    waitForLoadState(state: 'load' | 'domcontentloaded' | 'networkidle'): Promise<void>;
  }
}

// waitForLoadState 폴리필 구현
import { Page } from 'puppeteer';

Page.prototype.waitForLoadState = async function(state: 'load' | 'domcontentloaded' | 'networkidle') {
  switch (state) {
    case 'load':
      await this.waitForFunction(() => document.readyState === 'complete');
      break;
    case 'domcontentloaded':
      await this.waitForFunction(() => document.readyState !== 'loading');
      break;
    case 'networkidle':
      await this.waitForLoadState('networkidle2');
      break;
  }
};