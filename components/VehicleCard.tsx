import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Fuel, Gauge, Settings, Calendar } from 'lucide-react';

interface VehicleProps {
    id: string;
    make: string;
    model: string;
    year: number;
    pricePerWeek: number;
    image: string;
    transmission: string;
    fuelType: string;
    mileage: number;
}

export const VehicleCard: React.FC<VehicleProps> = ({
    id,
    make,
    model,
    year,
    pricePerWeek,
    image,
    transmission,
    fuelType,
    mileage,
}) => {
    return (
        <Card hoverEffect glass className="overflow-hidden group">
            {/* Image Container */}
            <div className="relative h-48 w-full overflow-hidden">
                <Image
                    src={image}
                    alt={`${year} ${make} ${model}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-3 right-3 bg-bg-primary/80 backdrop-blur-md px-3 py-1 rounded-full border border-border-glass">
                    <span className="text-xs font-semibold text-white">${pricePerWeek}/week</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <h3 className="text-lg font-bold text-white mb-1">{make} {model}</h3>
                <p className="text-sm text-text-tertiary mb-4">{year} • Stock #{id.slice(0, 6)}</p>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Settings className="w-4 h-4 text-primary" />
                        <span>{transmission}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Fuel className="w-4 h-4 text-primary" />
                        <span>{fuelType}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Gauge className="w-4 h-4 text-primary" />
                        <span>{mileage.toLocaleString()} km</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>Available Now</span>
                    </div>
                </div>

                {/* Action */}
                <Link href={`/vehicles/${id}`} className="w-full">
                    <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                        View Details
                    </Button>
                </Link>
            </div>
        </Card>
    );
};
