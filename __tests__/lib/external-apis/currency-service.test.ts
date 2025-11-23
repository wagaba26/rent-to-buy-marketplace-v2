import { CurrencyService } from '../../../lib/external-apis/currency-service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CurrencyService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        CurrencyService.clearCache();
        process.env.FRANKFURTER_API_ENABLED = 'true';
    });

    const mockRateResponse = {
        amount: 1.0,
        base: 'USD',
        date: '2023-01-01',
        rates: {
            EUR: 0.85,
            GBP: 0.75,
            UGX: 3700,
        },
    };

    describe('convert', () => {
        it('should convert currency successfully', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockRateResponse });

            const result = await CurrencyService.convert(100, 'USD', 'EUR');

            expect(result).toBe(85); // 100 * 0.85
            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('/latest'),
                expect.objectContaining({
                    params: { from: 'USD', to: 'EUR' },
                })
            );
        });

        it('should return original amount if currencies are same', async () => {
            const result = await CurrencyService.convert(100, 'USD', 'USD');
            expect(result).toBe(100);
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });

        it('should throw error for negative amount', async () => {
            await expect(CurrencyService.convert(-100, 'USD', 'EUR')).rejects.toThrow('Amount must be positive');
        });

        it('should use cached rates', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockRateResponse });

            await CurrencyService.convert(100, 'USD', 'EUR');
            await CurrencyService.convert(200, 'USD', 'EUR');

            expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        });
    });

    describe('getExchangeRate', () => {
        it('should fetch exchange rate successfully', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockRateResponse });

            const rate = await CurrencyService.getExchangeRate('USD', 'EUR');

            expect(rate).toBe(0.85);
        });

        it('should throw error for invalid currency', async () => {
            const error = new Error('Not Found');
            (error as any).isAxiosError = true;
            (error as any).response = { status: 404 };
            (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
            mockedAxios.get.mockRejectedValueOnce(error);

            await expect(CurrencyService.getExchangeRate('INVALID', 'EUR')).rejects.toThrow('Invalid currency code');
        });
    });

    describe('getMultipleRates', () => {
        it('should fetch multiple rates successfully', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockRateResponse });

            const rates = await CurrencyService.getMultipleRates('USD', ['EUR', 'GBP']);

            expect(rates).toEqual({
                EUR: 0.85,
                GBP: 0.75,
                UGX: 3700,
            });
        });
    });

    describe('convertToMultiple', () => {
        it('should convert to multiple currencies', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockRateResponse });

            const result = await CurrencyService.convertToMultiple(100, 'USD', ['EUR', 'GBP']);

            expect(result).toEqual({
                EUR: 85,
                GBP: 75,
                UGX: 370000,
            });
        });
    });
});
