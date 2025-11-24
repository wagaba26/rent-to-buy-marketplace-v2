'use client';

import { useState, useEffect } from 'react';
import { vehiclesApi } from '@/lib/api';

interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    vehicle_type: string;
    price: number;
    deposit_amount: number;
    weekly_payment?: number;
    monthly_payment?: number;
    payment_frequency: string;
    images?: string[];
    status: string;
    mileage?: number;
    eligibility_tier?: string;
    transmission?: string;
    fuel_type?: string;
}

interface UseVehiclesOptions {
    limit?: number;
    offset?: number;
    type?: string;
    status?: string;
    autoFetch?: boolean;
}

export function useVehicles(options: UseVehiclesOptions = {}) {
    const { limit = 20, offset = 0, type, status = 'available', autoFetch = true } = options;

    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchVehicles = async (customParams?: Partial<UseVehiclesOptions>) => {
        setLoading(true);
        setError(null);

        try {
            const params = { limit, offset, type, status, ...customParams };
            const response = await vehiclesApi.getAll(params);

            if (response.success && response.data) {
                setVehicles(response.data.vehicles || []);
            } else {
                setError(response.error?.message || 'Failed to fetch vehicles');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (autoFetch) {
            fetchVehicles();
        }
    }, [limit, offset, type, status, autoFetch]);

    return { vehicles, loading, error, refetch: fetchVehicles };
}

export function useVehicle(id: string) {
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVehicle = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await vehiclesApi.getById(id);

                if (response.success && response.data) {
                    setVehicle(response.data.vehicle || response.data);
                } else {
                    setError(response.error?.message || 'Failed to fetch vehicle');
                }
            } catch (err) {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchVehicle();
        }
    }, [id]);

    return { vehicle, loading, error };
}
