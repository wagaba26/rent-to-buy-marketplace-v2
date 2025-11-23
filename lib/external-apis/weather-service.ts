import axios from 'axios';

interface CurrentWeather {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    time: string;
}

interface HourlyWeather {
    time: string[];
    precipitation: number[];
    windspeed_10m: number[];
}

interface WeatherResponse {
    latitude: number;
    longitude: number;
    current_weather: CurrentWeather;
    hourly?: HourlyWeather;
}

interface WeatherRiskAssessment {
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    weather: CurrentWeather;
}

/**
 * Weather Service using Open-Meteo API
 * Provides weather data and risk assessment for telematics
 */
export class WeatherService {
    private static OPEN_METEO_BASE = process.env.OPEN_METEO_API_BASE_URL || 'https://api.open-meteo.com/v1';

    /**
     * Get current weather for a location
     * @param lat - Latitude
     * @param lon - Longitude
     * @returns Current weather data
     */
    static async getCurrentWeather(lat: number, lon: number): Promise<WeatherResponse> {
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
        if (process.env.OPEN_METEO_API_ENABLED === 'false') {
            throw new Error('Open-Meteo API is disabled');
        }

        try {
            console.log(`[WeatherService] Fetching weather for: ${lat}, ${lon}`);
            const response = await axios.get<WeatherResponse>(`${this.OPEN_METEO_BASE}/forecast`, {
                params: {
                    latitude: lat,
                    longitude: lon,
                    current_weather: true,
                    hourly: 'precipitation,windspeed_10m',
                    timezone: 'auto',
                },
                timeout: 5000,
                headers: {
                    'User-Agent': 'RentToBuyCarMarketplace/1.0',
                },
            });

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Open-Meteo API error: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Calculate weather-based risk score
     * @param weatherData - Weather response from API
     * @returns Risk assessment with score and factors
     */
    static calculateWeatherRisk(weatherData: WeatherResponse): WeatherRiskAssessment {
        const { temperature, windspeed, weathercode } = weatherData.current_weather;
        let riskScore = 0;
        const factors: string[] = [];

        // Weather code interpretation (WMO codes)
        // 0: Clear sky
        // 1-3: Mainly clear, partly cloudy, overcast
        // 45-48: Fog
        // 51-67: Rain (various intensities)
        // 71-77: Snow
        // 80-99: Rain showers, thunderstorms

        // Precipitation risk
        if (weathercode >= 80 && weathercode < 90) {
            riskScore += 30;
            factors.push('Heavy rain/showers');
        } else if (weathercode >= 90) {
            riskScore += 50;
            factors.push('Thunderstorm conditions');
        } else if (weathercode >= 71 && weathercode < 80) {
            riskScore += 40;
            factors.push('Snow conditions');
        } else if (weathercode >= 51 && weathercode < 70) {
            riskScore += 20;
            factors.push('Light to moderate rain');
        } else if (weathercode >= 45 && weathercode < 50) {
            riskScore += 15;
            factors.push('Fog/reduced visibility');
        }

        // Wind risk
        if (windspeed > 70) {
            riskScore += 40;
            factors.push('Severe winds (>70 km/h)');
        } else if (windspeed > 50) {
            riskScore += 25;
            factors.push('Strong winds (>50 km/h)');
        } else if (windspeed > 30) {
            riskScore += 10;
            factors.push('Moderate winds (>30 km/h)');
        }

        // Temperature risk
        if (temperature < 0) {
            riskScore += 15;
            factors.push('Freezing temperatures');
        } else if (temperature > 40) {
            riskScore += 10;
            factors.push('Extreme heat');
        }

        // Cap risk score at 100
        riskScore = Math.min(riskScore, 100);

        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' | 'critical';
        if (riskScore < 25) {
            riskLevel = 'low';
        } else if (riskScore < 50) {
            riskLevel = 'medium';
        } else if (riskScore < 75) {
            riskLevel = 'high';
        } else {
            riskLevel = 'critical';
        }

        return {
            riskScore,
            riskLevel,
            factors,
            weather: weatherData.current_weather,
        };
    }

    /**
     * Get weather risk assessment for a location
     * @param lat - Latitude
     * @param lon - Longitude
     * @returns Complete risk assessment
     */
    static async getWeatherRiskAssessment(lat: number, lon: number): Promise<WeatherRiskAssessment> {
        const weatherData = await this.getCurrentWeather(lat, lon);
        return this.calculateWeatherRisk(weatherData);
    }

    /**
     * Get weather description from weather code
     * @param weathercode - WMO weather code
     * @returns Human-readable weather description
     */
    static getWeatherDescription(weathercode: number): string {
        const descriptions: { [key: number]: string } = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Foggy',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            71: 'Slight snow',
            73: 'Moderate snow',
            75: 'Heavy snow',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            85: 'Slight snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with slight hail',
            99: 'Thunderstorm with heavy hail',
        };

        return descriptions[weathercode] || 'Unknown conditions';
    }
}
