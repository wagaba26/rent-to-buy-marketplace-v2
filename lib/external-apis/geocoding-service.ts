import axios from 'axios';
import Bottleneck from 'bottleneck';

interface GeocodingResult {
    place_id: number;
    licence: string;
    osm_type: string;
    osm_id: number;
    lat: string;
    lon: string;
    display_name: string;
    address?: {
        road?: string;
        city?: string;
        state?: string;
        country?: string;
        postcode?: string;
    };
    boundingbox: string[];
}

interface ReverseGeocodingResult {
    place_id: number;
    licence: string;
    osm_type: string;
    osm_id: number;
    lat: string;
    lon: string;
    display_name: string;
    address: {
        road?: string;
        suburb?: string;
        city?: string;
        county?: string;
        state?: string;
        postcode?: string;
        country?: string;
        country_code?: string;
    };
}

/**
 * Geocoding Service using OpenStreetMap Nominatim
 * Provides address validation, geocoding, and reverse geocoding
 * 
 * IMPORTANT: Respects OSM usage policy with 1 request per second rate limit
 */
export class GeocodingService {
    private static OSM_BASE = process.env.OPENSTREETMAP_API_BASE_URL || 'https://nominatim.openstreetmap.org';
    private static USER_AGENT = process.env.OPENSTREETMAP_USER_AGENT || 'RentToBuyCarMarketplace/1.0';

    // Rate limiter: 1 request per second as per OSM usage policy
    private static limiter = new Bottleneck({
        minTime: 1000, // 1 request per second
        maxConcurrent: 1,
    });

    /**
     * Geocode an address to GPS coordinates
     * @param address - Full address string
     * @returns Geocoding result with coordinates and address details
     */
    static async geocodeAddress(address: string): Promise<GeocodingResult | null> {
        if (!address || address.trim().length === 0) {
            throw new Error('Address cannot be empty');
        }

        // Check if API is enabled
        if (process.env.OPENSTREETMAP_API_ENABLED === 'false') {
            throw new Error('OpenStreetMap API is disabled');
        }

        return this.limiter.schedule(async () => {
            try {
                console.log(`[GeocodingService] Geocoding address: ${address}`);
                const response = await axios.get<GeocodingResult[]>(`${this.OSM_BASE}/search`, {
                    params: {
                        q: address,
                        format: 'json',
                        limit: 1,
                        addressdetails: 1,
                    },
                    headers: {
                        'User-Agent': this.USER_AGENT,
                    },
                    timeout: 5000,
                });

                console.log(`[GeocodingService] Response data length: ${response.data.length}`);
                if (response.data.length === 0) {
                    console.log(`[GeocodingService] No results found for address: ${address}`);
                    return null;
                }

                return response.data[0];
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    throw new Error(`OpenStreetMap API error: ${error.message}`);
                }
                throw error;
            }
        });
    }

    /**
     * Reverse geocode GPS coordinates to an address
     * @param lat - Latitude
     * @param lon - Longitude
     * @returns Address details for the coordinates
     */
    static async reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodingResult | null> {
        if (lat === undefined || lat === null || lon === undefined || lon === null) {
            throw new Error('Latitude and longitude are required');
        }

        if (lat < -90 || lat > 90) {
            throw new Error('Invalid latitude. Must be between -90 and 90');
        }

        if (lon < -180 || lon > 180) {
            throw new Error('Invalid longitude. Must be between -180 and 180');
        }

        // Check if API is enabled
        if (process.env.OPENSTREETMAP_API_ENABLED === 'false') {
            throw new Error('OpenStreetMap API is disabled');
        }

        return this.limiter.schedule(async () => {
            try {
                console.log(`[GeocodingService] Reverse geocoding: ${lat}, ${lon}`);
                const response = await axios.get<ReverseGeocodingResult>(`${this.OSM_BASE}/reverse`, {
                    params: {
                        lat,
                        lon,
                        format: 'json',
                        addressdetails: 1,
                    },
                    headers: {
                        'User-Agent': this.USER_AGENT,
                    },
                    timeout: 5000,
                });

                return response.data;
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    throw new Error(`OpenStreetMap API error: ${error.message}`);
                }
                throw error;
            }
        });
    }

    /**
     * Validate an address by attempting to geocode it
     * @param address - Address to validate
     * @returns true if address can be geocoded, false otherwise
     */
    static async validateAddress(address: string): Promise<boolean> {
        try {
            const result = await this.geocodeAddress(address);
            return result !== null;
        } catch (error) {
            console.error(`[GeocodingService] Address validation error: ${error}`);
            return false;
        }
    }

    /**
     * Extract coordinates from geocoding result
     * @param result - Geocoding result
     * @returns Object with lat and lon as numbers
     */
    static extractCoordinates(result: GeocodingResult): { lat: number; lon: number } {
        return {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
        };
    }

    /**
     * Format address from geocoding result
     * @param result - Geocoding result
     * @returns Formatted address string
     */
    static formatAddress(result: GeocodingResult | ReverseGeocodingResult): string {
        return result.display_name;
    }

    /**
     * Get rate limiter statistics
     * @returns Current rate limiter status
     */
    static getRateLimiterStats() {
        return {
            running: this.limiter.running(),
            queued: this.limiter.queued(),
        };
    }
}
