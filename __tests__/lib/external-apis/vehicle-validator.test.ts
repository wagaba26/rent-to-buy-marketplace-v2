import { VehicleValidator } from '../../../lib/external-apis/vehicle-validator';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('VehicleValidator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        VehicleValidator.clearCache();
        process.env.NHTSA_API_ENABLED = 'true';
    });

    const mockNHTSAResponse = {
        Count: 4,
        Message: 'Results returned successfully',
        SearchCriteria: 'VIN: 5UXWX7C5*BA',
        Results: [
            { Variable: 'Make', Value: 'BMW', ValueId: '452' },
            { Variable: 'Model', Value: 'X7', ValueId: '123' },
            { Variable: 'Model Year', Value: '2022', ValueId: '345' },
            { Variable: 'Body Class', Value: 'Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)', ValueId: '567' },
            { Variable: 'Displacement (L)', Value: '3.0', ValueId: '789' },
            { Variable: 'Fuel Type - Primary', Value: 'Gasoline', ValueId: '901' },
            { Variable: 'Manufacturer Name', Value: 'BMW OF NORTH AMERICA, LLC', ValueId: '234' },
            { Variable: 'Vehicle Type', Value: 'MULTIPURPOSE PASSENGER VEHICLE (MPV)', ValueId: '567' },
        ],
    };

    describe('decodeVIN', () => {
        it('should decode a valid VIN successfully', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockNHTSAResponse });

            const result = await VehicleValidator.decodeVIN('5UXWX7C5*BA123456');

            expect(result).toEqual(mockNHTSAResponse);
            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('/vehicles/DecodeVin/5UXWX7C5*BA123456'),
                expect.any(Object)
            );
        });

        it('should throw error for invalid VIN length', async () => {
            await expect(VehicleValidator.decodeVIN('INVALID')).rejects.toThrow('Invalid VIN format');
        });

        it('should return cached result for subsequent calls', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockNHTSAResponse });

            await VehicleValidator.decodeVIN('5UXWX7C5*BA123456');
            const result = await VehicleValidator.decodeVIN('5UXWX7C5*BA123456');

            expect(result).toEqual(mockNHTSAResponse);
            expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        });

        it('should throw error if API is disabled', async () => {
            process.env.NHTSA_API_ENABLED = 'false';
            await expect(VehicleValidator.decodeVIN('5UXWX7C5*BA123456')).rejects.toThrow('NHTSA API is disabled');
        });

        it('should handle API errors', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));
            await expect(VehicleValidator.decodeVIN('5UXWX7C5*BA123456')).rejects.toThrow();
        });
    });

    describe('extractVehicleSpecs', () => {
        it('should extract specifications correctly', () => {
            const specs = VehicleValidator.extractVehicleSpecs(mockNHTSAResponse);

            expect(specs).toEqual({
                make: 'BMW',
                model: 'X7',
                year: '2022',
                bodyType: 'Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)',
                engineSize: '3.0',
                fuelType: 'Gasoline',
                manufacturer: 'BMW OF NORTH AMERICA, LLC',
                vehicleType: 'MULTIPURPOSE PASSENGER VEHICLE (MPV)',
            });
        });

        it('should handle missing values', () => {
            const emptyResponse = { ...mockNHTSAResponse, Results: [] };
            const specs = VehicleValidator.extractVehicleSpecs(emptyResponse);

            expect(specs.make).toBeNull();
            expect(specs.model).toBeNull();
        });
    });

    describe('isValidVIN', () => {
        it('should return true for valid response with core details', () => {
            expect(VehicleValidator.isValidVIN(mockNHTSAResponse)).toBe(true);
        });

        it('should return false if core details are missing', () => {
            const incompleteResponse = {
                ...mockNHTSAResponse,
                Results: [{ Variable: 'Make', Value: 'BMW', ValueId: '452' }],
            };
            expect(VehicleValidator.isValidVIN(incompleteResponse)).toBe(false);
        });
    });
});
