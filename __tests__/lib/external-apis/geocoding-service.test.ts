import { GeocodingService } from '../../../lib/external-apis/geocoding-service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GeocodingService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.OPENSTREETMAP_API_ENABLED = 'true';
    });

    const mockGeocodeResponse = [
        {
            place_id: 123,
            licence: 'Data © OpenStreetMap contributors',
            osm_type: 'way',
            osm_id: 456,
            lat: '37.4224764',
            lon: '-122.0842499',
            display_name: 'Googleplex, 1600, Amphitheatre Parkway, Mountain View, Santa Clara County, California, 94043, United States',
            boundingbox: ['37.422', '37.423', '-122.085', '-122.083'],
        },
    ];

    const mockReverseResponse = {
        place_id: 123,
        licence: 'Data © OpenStreetMap contributors',
        osm_type: 'way',
        osm_id: 456,
        lat: '37.4224764',
        lon: '-122.0842499',
        display_name: 'Googleplex, 1600, Amphitheatre Parkway, Mountain View, Santa Clara County, California, 94043, United States',
        address: {
            road: 'Amphitheatre Parkway',
            city: 'Mountain View',
            state: 'California',
            country: 'United States',
        },
    };

    describe('geocodeAddress', () => {
        it('should geocode address successfully', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockGeocodeResponse });

            const result = await GeocodingService.geocodeAddress('1600 Amphitheatre Parkway');

            expect(result).toEqual(mockGeocodeResponse[0]);
            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('/search'),
                expect.objectContaining({
                    params: expect.objectContaining({ q: '1600 Amphitheatre Parkway' }),
                })
            );
        });

        it('should return null if no results found', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: [] });

            const result = await GeocodingService.geocodeAddress('Nonexistent Place 12345');

            expect(result).toBeNull();
        });

        it('should throw error if address is empty', async () => {
            await expect(GeocodingService.geocodeAddress('')).rejects.toThrow('Address cannot be empty');
        });

        it('should throw error if API is disabled', async () => {
            process.env.OPENSTREETMAP_API_ENABLED = 'false';
            await expect(GeocodingService.geocodeAddress('123 Main St')).rejects.toThrow('OpenStreetMap API is disabled');
        });
    });

    describe('reverseGeocode', () => {
        it('should reverse geocode coordinates successfully', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockReverseResponse });

            const result = await GeocodingService.reverseGeocode(37.4224764, -122.0842499);

            expect(result).toEqual(mockReverseResponse);
            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('/reverse'),
                expect.objectContaining({
                    params: expect.objectContaining({ lat: 37.4224764, lon: -122.0842499 }),
                })
            );
        });

        it('should throw error for invalid coordinates', async () => {
            await expect(GeocodingService.reverseGeocode(100, 0)).rejects.toThrow('Invalid latitude');
            await expect(GeocodingService.reverseGeocode(0, 200)).rejects.toThrow('Invalid longitude');
        });
    });

    describe('validateAddress', () => {
        it('should return true for valid address', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockGeocodeResponse });
            const isValid = await GeocodingService.validateAddress('1600 Amphitheatre Parkway');
            expect(isValid).toBe(true);
        });

        it('should return false for invalid address', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: [] });
            const isValid = await GeocodingService.validateAddress('Invalid Address 123');
            expect(isValid).toBe(false);
        });
    });

    describe('extractCoordinates', () => {
        it('should extract coordinates correctly', () => {
            const coords = GeocodingService.extractCoordinates(mockGeocodeResponse[0]);
            expect(coords).toEqual({ lat: 37.4224764, lon: -122.0842499 });
        });
    });
});
