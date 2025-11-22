import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import CircuitBreaker from 'opossum';

export interface CircuitBreakerOptions {
  timeout?: number; // Request timeout in ms
  errorThresholdPercentage?: number; // Percentage of failures to open circuit
  resetTimeout?: number; // Time to wait before attempting to close circuit
  rollingCountTimeout?: number; // Time window for rolling stats
  rollingCountBuckets?: number; // Number of buckets in rolling window
  name?: string; // Name for logging
}

export interface ResilientHttpClientConfig {
  baseURL?: string;
  timeout?: number;
  circuitBreaker?: CircuitBreakerOptions;
  retries?: number;
  retryDelay?: number;
  fallback?: (error: any) => any;
}

export class ResilientHttpClient {
  private axiosInstance: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private config: ResilientHttpClientConfig;

  constructor(config: ResilientHttpClientConfig = {}) {
    this.config = {
      timeout: 5000,
      retries: 3,
      retryDelay: 1000,
      circuitBreaker: {
        timeout: config.timeout || 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        rollingCountTimeout: 60000,
        rollingCountBuckets: 10,
        name: config.circuitBreaker?.name || 'http-client',
      },
      ...config,
    };

    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Create circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      this.makeRequest.bind(this),
      {
        timeout: this.config.circuitBreaker!.timeout,
        errorThresholdPercentage: this.config.circuitBreaker!.errorThresholdPercentage,
        resetTimeout: this.config.circuitBreaker!.resetTimeout,
        rollingCountTimeout: this.config.circuitBreaker!.rollingCountTimeout,
        rollingCountBuckets: this.config.circuitBreaker!.rollingCountBuckets,
        name: this.config.circuitBreaker!.name,
      }
    );

    // Circuit breaker event handlers
    this.circuitBreaker.on('open', () => {
      console.warn(`[CircuitBreaker] ${this.config.circuitBreaker!.name} opened - too many failures`);
    });

    this.circuitBreaker.on('halfOpen', () => {
      console.info(`[CircuitBreaker] ${this.config.circuitBreaker!.name} half-open - testing connection`);
    });

    this.circuitBreaker.on('close', () => {
      console.info(`[CircuitBreaker] ${this.config.circuitBreaker!.name} closed - service recovered`);
    });

    // Set fallback if provided
    if (this.config.fallback) {
      this.circuitBreaker.fallback(this.config.fallback);
    }
  }

  private async makeRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
    let lastError: AxiosError | null = null;
    const maxRetries = this.config.retries || 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.axiosInstance.request(config);
        return response;
      } catch (error) {
        lastError = error as AxiosError;

        // Don't retry on 4xx errors (client errors)
        if (error instanceof AxiosError && error.response && error.response.status >= 400 && error.response.status < 500) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt < maxRetries) {
          const delay = this.config.retryDelay! * Math.pow(2, attempt); // Exponential backoff
          await this.sleep(delay);
          continue;
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.circuitBreaker.fire({ ...config, method: 'GET', url });
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.circuitBreaker.fire({ ...config, method: 'POST', url, data });
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.circuitBreaker.fire({ ...config, method: 'PUT', url, data });
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.circuitBreaker.fire({ ...config, method: 'PATCH', url, data });
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.circuitBreaker.fire({ ...config, method: 'DELETE', url });
  }

  // Get circuit breaker stats
  getStats() {
    return {
      enabled: this.circuitBreaker.enabled,
      state: this.circuitBreaker.toJSON().state,
      stats: this.circuitBreaker.stats,
    };
  }

  // Manually open/close circuit breaker (for testing or manual control)
  open() {
    this.circuitBreaker.open();
  }

  close() {
    this.circuitBreaker.close();
  }
}

// Factory function for creating pre-configured clients
export function createServiceClient(serviceName: string, baseURL: string, options?: Partial<ResilientHttpClientConfig>): ResilientHttpClient {
  return new ResilientHttpClient({
    baseURL,
    circuitBreaker: {
      name: serviceName,
      ...options?.circuitBreaker,
    },
    timeout: options?.timeout || 5000,
    retries: options?.retries || 3,
    retryDelay: options?.retryDelay || 1000,
    fallback: options?.fallback || ((error) => {
      console.error(`[${serviceName}] Service unavailable, using fallback`, error);
      return {
        data: {
          success: false,
          error: {
            message: `${serviceName} is temporarily unavailable`,
            code: 'SERVICE_UNAVAILABLE',
          },
        },
        status: 503,
      };
    }),
  });
}

