export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  jitter: boolean;
}

export class RetryManager {
  constructor(private options: RetryOptions) {}

  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = "operation"
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        console.log(
          `[Retry] ${operationName} failed (attempt ${attempt + 1}/${this.options.maxRetries + 1}):`,
          error.message
        );

        // 마지막 시도라면 에러 throw
        if (attempt === this.options.maxRetries) {
          break;
        }

        // 재시도 불가능한 에러들
        if (this.isNonRetryableError(error as Error)) {
          console.log(
            `[Retry] Non-retryable error detected for ${operationName}`
          );
          break;
        }

        // 지연 시간 계산
        const delay = this.calculateDelay(attempt);
        console.log(`[Retry] Waiting ${delay}ms before retry...`);

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private calculateDelay(attempt: number): number {
    let delay = this.options.baseDelay;

    // 지수 백오프
    if (this.options.exponentialBackoff) {
      delay = Math.min(
        this.options.baseDelay * Math.pow(2, attempt),
        this.options.maxDelay
      );
    }

    // 지터 추가 (랜덤성)
    if (this.options.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // 재시도 불가능한 에러 패턴들
    const nonRetryablePatterns = [
      "invalid url",
      "invalid selector",
      "parsing error",
      "authentication failed",
      "permission denied",
      "access denied",
      "404",
      "401",
      "403",
    ];

    return nonRetryablePatterns.some((pattern) => message.includes(pattern));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
