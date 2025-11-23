import axios from 'axios';
import { createHash } from 'crypto';

interface NHTSAResult {
    Variable: string;
    Value: string;
    ValueId: string;
}

interface NHTSAResponse {
    Count: number;
    Message: string;
    SearchCriteria: string;
    Results: NHTSAResult[];
}

interface VehicleSpecs {
    make: string | null;
    model: string | null;
    year: string | null;
    bodyType: string | null;
    engineSize: string | null;
    fuelType: string | null;
    manufacturer: string | null;
    vehicleType: string | null;
}

/**
 * Vehicle Validator Service using NHTSA API
 * Provides VIN decoding and vehicle specification lookup
 */
export class VehicleValidator {
    private static NHTSA_BASE = process.env.NHTSA_API_BASE_URL || 'https://vpic.nhtsa.dot.gov/api';
    private static cache = new Map<string, NHTSAResponse>();
    private static CACHE_TTL = 86400000; // 24 hours in milliseconds
    private static cacheTimestamps = new Map<string, number>();

    /**
     * Decode a VIN number using NHTSA API
     * @param vin - Vehicle Identification Number (17 characters)
     * @returns NHTSA API response with vehicle details
     */
    static async decodeVIN(vin: string): Promise<NHTSAResponse> {
        // Validate VIN format (basic check)
        if (!vin || vin.length !== 17) {
            throw new Error('Invalid VIN format. VIN must be 17 characters.');
        }

        // Check if API is enabled
        if (process.env.NHTSA_API_ENABLED === 'false') {
            throw new Error('NHTSA API is disabled');
        }

        // Check cache first
        const cacheKey = createHash('md5').update(vin.toUpperCase()).digest('hex');
        const cachedData = this.cache.get(cacheKey);
        const cacheTimestamp = this.cacheTimestamps.get(cacheKey);

        if (cachedData && cacheTimestamp && Date.now() - cacheTimestamp < this.CACHE_TTL) {
            console.log(`[VehicleValidator] Cache hit for VIN: ${vin}`);
            return cachedData;
        }

        try {
            console.log(`[VehicleValidator] Fetching data for VIN: ${vin}`);
            const response = await axios.get<NHTSAResponse>(
                `${this.NHTSA_BASE}/vehicles/DecodeVin/${vin.toUpperCase()}?format=json`,
                {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'RentToBuyCarMarketplace/1.0',
                    },
                }
            );

            const data = response.data;

            // Cache the response
            this.cache.set(cacheKey, data);
            this.cacheTimestamps.set(cacheKey, Date.now());

            return data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`NHTSA API error: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Extract vehicle specifications from NHTSA response
     * @param nhtsaResponse - Response from NHTSA API
     * @returns Structured vehicle specifications
     */
    static extractVehicleSpecs(nhtsaResponse: NHTSAResponse): VehicleSpecs {
        const results = nhtsaResponse.Results;

        const findValue = (variable: string): string | null => {
            const result = results.find((r) => r.Variable === variable);
            return result?.Value || null;
        };

        return {
            make: findValue('Make'),
            model: findValue('Model'),
            year: findValue('Model Year'),
            bodyType: findValue('Body Class'),
            engineSize: findValue('Displacement (L)'),
            fuelType: findValue('Fuel Type - Primary'),
            manufacturer: findValue('Manufacturer Name'),
            vehicleType: findValue('Vehicle Type'),
        };
    }

    /**
     * Validate if VIN decode was successful
     * @param nhtsaResponse - Response from NHTSA API
     * @returns true if VIN is valid and data was found
     */
    static isValidVIN(nhtsaResponse: NHTSAResponse): boolean {
        const specs = this.extractVehicleSpecs(nhtsaResponse);
        // A valid VIN should at least have make, model, and year
        return !!(specs.make && specs.model && specs.year);
    }

    /**
     * Clear the cache (useful for testing or memory management)
     */
    static clearCache(): void {
        this.cache.clear();
        this.cacheTimestamps.clear();
        console.log('[VehicleValidator] Cache cleared');
    }

    /**
     * Get cache statistics
     * @returns Object with cache size and hit rate info
     */
    static getCacheStats(): { size: number; entries: number } {
        return {
            size: this.cache.size,
            entries: this.cacheTimestamps.size,
        };
    }
}
