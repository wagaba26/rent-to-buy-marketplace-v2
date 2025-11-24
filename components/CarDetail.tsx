'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from './ui/Button';
import { Slider } from './ui/Slider';
import { CheckCircle2, ShieldCheck, Calendar, Settings, Fuel, Gauge, Info } from 'lucide-react';

interface CarDetailProps {
    vehicle: any; // Replace with proper type
}

export const CarDetail: React.FC<CarDetailProps> = ({ vehicle }) => {
    const [downPayment, setDownPayment] = useState(vehicle.deposit_amount || 1000);
    const [termLength, setTermLength] = useState(48); // months

    // Mock calculations
    const weeklyPayment = Math.round((vehicle.price - downPayment) / (termLength * 4.33));
    const totalCost = downPayment + (weeklyPayment * termLength * 4.33);

    return (
        <div className="min-h-screen bg-bg-primary pb-20">
            {/* Hero Section */}
            <div className="relative h-[60vh] w-full">
                <Image
                    src={vehicle.images?.[0] || ''}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/50 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 md:px-6 pb-12">
                    <div className="max-w-4xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-bold mb-4 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            Available Now
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold mb-4">{vehicle.make} {vehicle.model} <span className="text-text-tertiary font-normal">{vehicle.year}</span></h1>
                        <div className="flex flex-wrap gap-6 text-text-secondary">
                            <div className="flex items-center gap-2">
                                <Gauge className="w-5 h-5 text-primary" />
                                <span>{vehicle.mileage?.toLocaleString()} km</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-primary" />
                                <span>{vehicle.transmission}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Fuel className="w-5 h-5 text-primary" />
                                <span>{vehicle.fuel_type}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 md:px-6 -mt-10 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Ownership Plan */}
                        <div className="bg-bg-secondary border border-border-primary rounded-3xl p-8 shadow-lg">
                            <h2 className="text-2xl font-bold mb-6">Your Ownership Plan</h2>

                            {/* Timeline */}
                            <div className="relative py-8 mb-8">
                                <div className="absolute top-1/2 left-0 right-0 h-1 bg-bg-tertiary -translate-y-1/2 rounded-full" />
                                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent -translate-y-1/2 rounded-full" style={{ width: '30%' }} />

                                <div className="relative flex justify-between">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold z-10 ring-4 ring-bg-secondary">1</div>
                                        <span className="text-sm font-medium">Apply</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-bg-tertiary text-text-tertiary flex items-center justify-center font-bold z-10 ring-4 ring-bg-secondary">2</div>
                                        <span className="text-sm font-medium text-text-tertiary">Drive</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-bg-tertiary text-text-tertiary flex items-center justify-center font-bold z-10 ring-4 ring-bg-secondary">3</div>
                                        <span className="text-sm font-medium text-text-tertiary">Own</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-bg-tertiary/50 p-4 rounded-2xl border border-border-secondary">
                                    <ShieldCheck className="w-8 h-8 text-accent mb-3" />
                                    <h3 className="font-bold mb-1">Warranty Included</h3>
                                    <p className="text-sm text-text-secondary">Comprehensive coverage for peace of mind.</p>
                                </div>
                                <div className="bg-bg-tertiary/50 p-4 rounded-2xl border border-border-secondary">
                                    <Calendar className="w-8 h-8 text-accent mb-3" />
                                    <h3 className="font-bold mb-1">Flexible Terms</h3>
                                    <p className="text-sm text-text-secondary">Change your plan if your needs change.</p>
                                </div>
                                <div className="bg-bg-tertiary/50 p-4 rounded-2xl border border-border-secondary">
                                    <CheckCircle2 className="w-8 h-8 text-accent mb-3" />
                                    <h3 className="font-bold mb-1">No Hidden Fees</h3>
                                    <p className="text-sm text-text-secondary">Transparent pricing from day one.</p>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Description */}
                        <div className="bg-bg-secondary border border-border-primary rounded-3xl p-8 shadow-lg">
                            <h2 className="text-2xl font-bold mb-4">Vehicle Overview</h2>
                            <p className="text-text-secondary leading-relaxed">
                                This {vehicle.year} {vehicle.make} {vehicle.model} is a perfect blend of style and performance.
                                Meticulously inspected and maintained, it comes with a full service history and our quality guarantee.
                                Features include premium sound system, leather seats, navigation, and advanced safety features.
                            </p>
                        </div>
                    </div>

                    {/* Sidebar Pricing */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 bg-bg-secondary/80 backdrop-blur-xl border border-border-glass p-6 rounded-3xl shadow-glass">
                            <div className="text-center mb-6">
                                <p className="text-text-secondary mb-1">Weekly Payment</p>
                                <div className="text-5xl font-bold text-white flex items-start justify-center gap-1">
                                    <span className="text-2xl mt-2">$</span>
                                    {weeklyPayment}
                                </div>
                            </div>

                            <div className="space-y-6 mb-8">
                                <Slider
                                    label="Down Payment"
                                    min={500}
                                    max={5000}
                                    step={100}
                                    value={downPayment}
                                    onChange={setDownPayment}
                                    unit="$"
                                />

                                <Slider
                                    label="Term Length (Months)"
                                    min={12}
                                    max={60}
                                    step={12}
                                    value={termLength}
                                    onChange={setTermLength}
                                />
                            </div>

                            <div className="space-y-3 mb-8 p-4 bg-bg-tertiary rounded-xl border border-border-secondary">
                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">Vehicle Price</span>
                                    <span className="font-medium">${vehicle.price.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">Service Fee</span>
                                    <span className="font-medium">$500</span>
                                </div>
                                <div className="h-px bg-border-primary" />
                                <div className="flex justify-between text-sm font-bold text-white">
                                    <span>Total Cost of Ownership</span>
                                    <span>${totalCost.toLocaleString()}</span>
                                </div>
                            </div>

                            <Button size="lg" className="w-full mb-3">
                                Start Pre-Approval Now
                            </Button>
                            <p className="text-xs text-center text-text-muted flex items-center justify-center gap-1">
                                <Info className="w-3 h-3" /> No impact on your credit score
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
