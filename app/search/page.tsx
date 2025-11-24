'use client';

import React, { useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import VehicleSearchFilter from '@/components/VehicleSearchFilter';
import VehicleGrid from '@/components/VehicleGrid';
import { Button } from '@/components/ui/Button';
import { Filter } from 'lucide-react';
import { useFilterStore } from '@/store/filterStore';
import { useVehicles } from '@/hooks/useVehicles';

export default function SearchPage() {
    const { openFilterPanel, filters } = useFilterStore();
    const { vehicles, loading, refetch } = useVehicles({
        limit: 20,
        status: 'available',
        autoFetch: true
    });

    // Refetch when filters change
    useEffect(() => {
        refetch(filters);
    }, [filters]);

    return (
        <main className="min-h-screen bg-bg-primary">
            <Navigation />

            <div className="pt-24 pb-12 container mx-auto px-4 md:px-6">
                {/* Filter Modal - Hidden by default, shown when filter button clicked */}
                <VehicleSearchFilter />

                <div className="max-w-7xl mx-auto">
                    {/* Header with Filter Button */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Available Vehicles</h1>
                            <p className="text-text-secondary">
                                {loading ? 'Loading...' : `${vehicles.length} vehicles found`}
                            </p>
                        </div>

                        <Button
                            variant="outline"
                            onClick={openFilterPanel}
                            leftIcon={<Filter className="w-4 h-4" />}
                        >
                            Filters
                        </Button>
                    </div>

                    {/* Vehicle Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="h-[400px] rounded-2xl bg-bg-secondary animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <VehicleGrid vehicles={vehicles} />
                    )}
                </div>
            </div>

            <Footer />
        </main>
    );
}
