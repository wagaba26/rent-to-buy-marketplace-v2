'use client';

import { motion } from 'framer-motion';
import { VehicleCard } from './VehicleCard';

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
  color?: string;
  mileage?: number;
  eligibility_tier?: string;
  fuel_type?: string;
  transmission?: string;
}

interface VehicleGridProps {
  vehicles: Vehicle[];
}

export default function VehicleGrid({ vehicles }: VehicleGridProps) {
  if (vehicles.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="w-16 h-16 mx-auto mb-6 bg-bg-secondary rounded-full flex items-center justify-center border border-border-primary">
          <svg className="w-8 h-8 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h3 className="font-heading text-2xl font-bold text-white mb-3">
          No vehicles available
        </h3>
        <p className="text-text-secondary max-w-md mx-auto">
          Check back soon for new listings! We update our inventory daily.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {vehicles.map((vehicle, index) => (
        <motion.div
          key={vehicle.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.4 }}
        >
          <VehicleCard
            id={vehicle.id}
            make={vehicle.make}
            model={vehicle.model}
            year={vehicle.year}
            pricePerWeek={vehicle.weekly_payment || Math.round(vehicle.price / 52)} // Fallback calculation
            image={vehicle.images?.[0] || ''}
            transmission={vehicle.transmission || 'Automatic'}
            fuelType={vehicle.fuel_type || 'Petrol'}
            mileage={vehicle.mileage || 0}
          />
        </motion.div>
      ))}
    </div>
  );
}
