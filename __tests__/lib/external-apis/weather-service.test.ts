import { WeatherService } from '../../../lib/external-apis/weather-service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WeatherService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.OPEN_METEO_API_ENABLED = 'true';
    });

    const mockWeatherResponse = {
        latitude: 52.52,
        longitude: 13.41,
        current_weather: {
            temperature: 20,
            windspeed: 10,
            winddirection: 180,
            weathercode: 0, // Clear sky
            time: '2023-01-01T12:00',
        },
    };

    const mockStormResponse = {
        ...mockWeatherResponse,
        current_weather: {
            ...mockWeatherResponse.current_weather,
            weathercode: 95, // Thunderstorm
            windspeed: 80, // High wind
        },
    };

    describe('getCurrentWeather', () => {
        it('should fetch weather data successfully', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockWeatherResponse });

            const result = await WeatherService.getCurrentWeather(52.52, 13.41);

            expect(result).toEqual(mockWeatherResponse);
            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('/forecast'),
                expect.objectContaining({
                    params: expect.objectContaining({ latitude: 52.52, longitude: 13.41 }),
                })
            );
        });

        it('should throw error for invalid coordinates', async () => {
            await expect(WeatherService.getCurrentWeather(100, 0)).rejects.toThrow('Invalid latitude');
        });

        it('should throw error if API is disabled', async () => {
            process.env.OPEN_METEO_API_ENABLED = 'false';
            await expect(WeatherService.getCurrentWeather(52.52, 13.41)).rejects.toThrow('Open-Meteo API is disabled');
        });
    });

    describe('calculateWeatherRisk', () => {
        it('should calculate low risk for clear weather', () => {
            const risk = WeatherService.calculateWeatherRisk(mockWeatherResponse);

            expect(risk.riskScore).toBe(0);
            expect(risk.riskLevel).toBe('low');
            expect(risk.factors).toHaveLength(0);
        });

        it('should calculate high risk for storm conditions', () => {
            const risk = WeatherService.calculateWeatherRisk(mockStormResponse);

            // 50 (Thunderstorm) + 40 (Severe winds) = 90
            expect(risk.riskScore).toBe(90);
            expect(risk.riskLevel).toBe('critical');
            expect(risk.factors).toContain('Thunderstorm conditions');
            expect(risk.factors).toContain('Severe winds (>70 km/h)');
        });

        it('should calculate moderate risk for rain', () => {
            const rainResponse = {
                ...mockWeatherResponse,
                current_weather: {
                    ...mockWeatherResponse.current_weather,
                    weathercode: 63, // Moderate rain
                    windspeed: 40, // Moderate wind
                },
            };

            const risk = WeatherService.calculateWeatherRisk(rainResponse);

            // 20 (Rain) + 10 (Moderate wind) = 30
            expect(risk.riskScore).toBe(30);
            expect(risk.riskLevel).toBe('medium');
        });
    });

    describe('getWeatherDescription', () => {
        it('should return correct description for weather code', () => {
            expect(WeatherService.getWeatherDescription(0)).toBe('Clear sky');
            expect(WeatherService.getWeatherDescription(95)).toBe('Thunderstorm');
            expect(WeatherService.getWeatherDescription(999)).toBe('Unknown conditions');
        });
    });
});
