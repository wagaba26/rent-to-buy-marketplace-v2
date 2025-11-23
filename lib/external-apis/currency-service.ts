import axios from 'axios';

interface ExchangeRateResponse {
    amount: number;
    base: string;
    date: string;
    rates: {
        [currency: string]: number;
    };
}

interface CachedRate {
    data: ExchangeRateResponse;
    expires: number;
}

/**
 * Currency Service using Frankfurter API
 * Provides real-time currency conversion and exchange rates
 */
export class CurrencyService {
    private static FRANKFURTER_BASE = process.env.FRANKFURTER_API_BASE_URL || 'https://api.frankfurter.app';
    private static cache = new Map<string, CachedRate>();
    private static CACHE_TTL = 3600000; // 1 hour in milliseconds

    /**
     * Convert amount from one currency to another
     * @param amount - Amount to convert
     * @param from - Source currency code (e.g., 'USD')
     * @param to - Target currency code (e.g., 'EUR')
     * @returns Converted amount
     */
    static async convert(amount: number, from: string, to: string): Promise<number> {
        if (amount < 0) {
            throw new Error('Amount must be positive');
        }

        if (!from || !to) {
            throw new Error('Source and target currencies are required');
        }

        // If same currency, return original amount
        if (from.toUpperCase() === to.toUpperCase()) {
            return amount;
        }

        // Check if API is enabled
        if (process.env.FRANKFURTER_API_ENABLED === 'false') {
            throw new Error('Frankfurter API is disabled');
        }

        const rate = await this.getExchangeRate(from, to);
        return amount * rate;
    }

    /**
     * Get exchange rate between two currencies
     * @param from - Source currency code
     * @param to - Target currency code
     * @returns Exchange rate
     */
    static async getExchangeRate(from: string, to: string): Promise<number> {
        const cacheKey = `${from.toUpperCase()}_${to.toUpperCase()}`;
        const cached = this.cache.get(cacheKey);

        // Return cached rate if still valid
        if (cached && cached.expires > Date.now()) {
            console.log(`[CurrencyService] Cache hit for ${cacheKey}`);
            return cached.data.rates[to.toUpperCase()];
        }

        try {
            console.log(`[CurrencyService] Fetching exchange rate: ${from} -> ${to}`);
            const response = await axios.get<ExchangeRateResponse>(
                `${this.FRANKFURTER_BASE}/latest`,
                {
                    params: {
                        from: from.toUpperCase(),
                        to: to.toUpperCase(),
                    },
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'RentToBuyCarMarketplace/1.0',
                    },
                }
            );

            // Cache the response
            this.cache.set(cacheKey, {
                data: response.data,
                expires: Date.now() + this.CACHE_TTL,
            });

            return response.data.rates[to.toUpperCase()];
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    throw new Error(`Invalid currency code: ${from} or ${to}`);
                }
                throw new Error(`Frankfurter API error: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Get multiple exchange rates for a base currency
     * @param from - Base currency code
     * @param toCurrencies - Array of target currency codes
     * @returns Object with exchange rates for each target currency
     */
    static async getMultipleRates(
        from: string,
        toCurrencies: string[]
    ): Promise<{ [currency: string]: number }> {
        if (!toCurrencies || toCurrencies.length === 0) {
            throw new Error('At least one target currency is required');
        }

        // Check if API is enabled
        if (process.env.FRANKFURTER_API_ENABLED === 'false') {
            throw new Error('Frankfurter API is disabled');
        }

        try {
            console.log(`[CurrencyService] Fetching multiple rates for ${from}`);
            const response = await axios.get<ExchangeRateResponse>(
                `${this.FRANKFURTER_BASE}/latest`,
                {
                    params: {
                        from: from.toUpperCase(),
                        to: toCurrencies.map((c) => c.toUpperCase()).join(','),
                    },
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'RentToBuyCarMarketplace/1.0',
                    },
                }
            );

            return response.data.rates;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Frankfurter API error: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Get available currencies
     * @returns Array of supported currency codes
     */
    static async getAvailableCurrencies(): Promise<string[]> {
        // Check if API is enabled
        if (process.env.FRANKFURTER_API_ENABLED === 'false') {
            throw new Error('Frankfurter API is disabled');
        }

        try {
            const response = await axios.get<{ [currency: string]: string }>(
                `${this.FRANKFURTER_BASE}/currencies`,
                {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'RentToBuyCarMarketplace/1.0',
                    },
                }
            );

            return Object.keys(response.data);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Frankfurter API error: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Convert amount to multiple currencies
     * @param amount - Amount to convert
     * @param from - Source currency code
     * @param toCurrencies - Array of target currency codes
     * @returns Object with converted amounts for each target currency
     */
    static async convertToMultiple(
        amount: number,
        from: string,
        toCurrencies: string[]
    ): Promise<{ [currency: string]: number }> {
        const rates = await this.getMultipleRates(from, toCurrencies);
        const converted: { [currency: string]: number } = {};

        for (const [currency, rate] of Object.entries(rates)) {
            converted[currency] = amount * rate;
        }

        return converted;
    }

    /**
     * Clear the cache
     */
    static clearCache(): void {
        this.cache.clear();
        console.log('[CurrencyService] Cache cleared');
    }

    /**
     * Get cache statistics
     * @returns Object with cache size info
     */
    static getCacheStats(): { size: number } {
        return {
            size: this.cache.size,
        };
    }
}
