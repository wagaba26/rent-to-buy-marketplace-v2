'use client';

import { useEffect, useState } from 'react';
import { useFilterStore } from '@/store/filterStore';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { Slider } from './ui/Slider'; // Assuming I can use Slider here if I want, but sticking to Input for ranges for now to match existing logic or upgrading.
// Actually, the prompt asked for "Sidebar filter panel with: Max Weekly Payment slider, Min Down Payment slider".
// I should implement Sliders.
import { useVehicleStore } from '@/store/vehicleStore';
import { X, Search, Filter } from 'lucide-react';

interface VehicleCategory {
    id: string;
    name: string;
    description?: string;
}

export default function VehicleSearchFilter() {
    const { filters, updateFilter, resetFilters, isFilterOpen, closeFilterPanel } = useFilterStore();
    const { fetchVehicles, loading } = useVehicleStore();
    const [categories, setCategories] = useState<VehicleCategory[]>([]);

    const vehicleTypes = [
        { value: '', label: 'All Types' },
        { value: 'motorcycle', label: 'Motorcycle' },
        { value: 'car', label: 'Car' },
        { value: 'van', label: 'Van' },
        { value: 'truck', label: 'Truck' },
    ];

    const eligibilityTiers = [
        { value: '', label: 'All Tiers' },
        { value: 'basic', label: 'Basic' },
        { value: 'standard', label: 'Standard' },
        { value: 'premium', label: 'Premium' },
        { value: 'luxury', label: 'Luxury' },
    ];

    const sortOptions = [
        { value: 'createdAt', label: 'Newest First' },
        { value: 'price', label: 'Price: Low to High' },
        { value: 'deposit', label: 'Deposit: Low to High' },
        { value: 'year', label: 'Year: Newest' },
    ];

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('/api/vehicles/categories');
                if (response.ok) {
                    const data = await response.json();
                    setCategories(data.success ? data.data.categories : []);
                }
            } catch (error) {
                console.error('Failed to fetch categories:', error);
            }
        };
        fetchCategories();
    }, []);

    const handleFilterChange = (key: keyof typeof filters, value: any) => {
        updateFilter(key, value);
    };

    const handleApplyFilters = () => {
        fetchVehicles(filters as any);
        closeFilterPanel();
    };

    const handleReset = () => {
        resetFilters();
        fetchVehicles({});
    };

    return (
        <>
            {/* Overlay - shown when filter is open */}
            {isFilterOpen && (
                <div
                    className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm z-40"
                    onClick={closeFilterPanel}
                />
            )}

            {/* Filter Modal Panel */}
            <aside
                className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-bg-secondary backdrop-blur-xl border-l border-border-glass z-50 overflow-y-auto transition-transform duration-300 ease-in-out shadow-2xl ${isFilterOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Filter className="w-5 h-5 text-primary" /> Filters
                        </h2>
                        <button
                            onClick={closeFilterPanel}
                            className="text-text-secondary hover:text-white transition-colors p-2 hover:bg-bg-tertiary rounded-lg"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Search */}
                    <Input
                        label="Search"
                        placeholder="Make, model, year..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        leftIcon={<Search className="w-4 h-4" />}
                        fullWidth
                    />

                    {/* Vehicle Type */}
                    <Select
                        label="Vehicle Type"
                        options={vehicleTypes}
                        value={filters.vehicleType}
                        onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
                        fullWidth
                    />

                    {/* Max Weekly Payment Slider (Simulated with Input for now as store expects numbers, but UI asked for slider) */}
                    {/* I will use the Slider component I created, assuming I can map it to the store values */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-3">Max Weekly Payment</label>
                        <Slider
                            label=""
                            min={0}
                            max={1000} // Example max
                            value={filters.maxPrice || 500} // Default or current
                            onChange={(val) => handleFilterChange('maxPrice', val)}
                            unit="$"
                        />
                    </div>

                    {/* Min Down Payment Slider */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-3">Min Down Payment</label>
                        <Slider
                            label=""
                            min={0}
                            max={5000}
                            value={filters.minDeposit || 0}
                            onChange={(val) => handleFilterChange('minDeposit', val)}
                            unit="$"
                        />
                    </div>

                    {/* Category */}
                    {categories.length > 0 && (
                        <Select
                            label="Category"
                            options={[
                                { value: '', label: 'All Categories' },
                                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
                            ]}
                            value={filters.categoryId}
                            onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                            fullWidth
                        />
                    )}

                    {/* Eligibility Tier */}
                    <Select
                        label="Eligibility Tier"
                        options={eligibilityTiers}
                        value={filters.eligibilityTier}
                        onChange={(e) => handleFilterChange('eligibilityTier', e.target.value)}
                        fullWidth
                    />

                    {/* Sort By */}
                    <Select
                        label="Sort By"
                        options={sortOptions}
                        value={`${filters.sortBy}-${filters.sortOrder}`}
                        onChange={(e) => {
                            const [sortBy, sortOrder] = e.target.value.split('-');
                            handleFilterChange('sortBy', sortBy);
                            handleFilterChange('sortOrder', sortOrder);
                        }}
                        fullWidth
                    />

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 pt-6 border-t border-border-secondary">
                        <Button
                            onClick={handleApplyFilters}
                            variant="primary"
                            className="w-full"
                            isLoading={loading}
                        >
                            Apply Filters
                        </Button>
                        <Button
                            onClick={handleReset}
                            variant="ghost"
                            className="w-full"
                            disabled={loading}
                        >
                            Reset All
                        </Button>
                    </div>
                </div>
            </aside>
        </>
    );
}
