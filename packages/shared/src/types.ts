// 상품 관련 타입
export interface Product {
  id: string;
  name: string;
  storeUrl: string;
  targetPrice?: number;
  currentPrice?: number;
  lastChecked?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceHistory {
  id: string;
  productId: string;
  price: number;
  checkedAt: Date;
  isAvailable: boolean;
}

// 크롤링 관련 타입
export interface CrawlResult {
  productId: string;
  price: number | null;
  isAvailable: boolean;
  error?: string;
  timestamp: Date;
}

export interface CrawlJob {
  id: string;
  productIds: string[];
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  results?: CrawlResult[];
}

// API 응답 타입 (최신)
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 실시간 이벤트 타입 (WebSocket)
export interface WebSocketEvent {
  type: "price_update" | "crawl_progress" | "error" | "notification";
  data: any;
  timestamp: Date;
}
