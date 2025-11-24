'use client';

import React from 'react';
import { Hero } from '@/components/Hero';
import Navigation from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { VehicleCard } from '@/components/VehicleCard';
import { Button } from '@/components/ui/Button';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, Clock, DollarSign, Search, Car } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import Link from 'next/link';

export default function Home() {
  // Fetch real vehicles from API
  const { vehicles, loading } = useVehicles({ limit: 4, status: 'available' });

  const steps = [
    {
      icon: <Search className="w-8 h-8 text-primary" />,
      title: 'Search & Apply',
      description: 'Browse our premium inventory and apply in minutes with our AI-powered system.',
    },
    {
      icon: <CheckCircle2 className="w-8 h-8 text-primary" />,
      title: 'Select a Plan',
      description: 'Choose a flexible payment plan that fits your budget and lifestyle.',
    },
    {
      icon: <Car className="w-8 h-8 text-primary" />,
      title: 'Drive & Pay',
      description: 'Pick up your car and start driving towards ownership with every payment.',
    },
  ];

  const benefits = [
    {
      icon: <DollarSign className="w-6 h-6 text-accent" />,
      title: 'Flexible Payments',
      description: 'Weekly or fortnightly payments that match your pay cycle.',
    },
    {
      icon: <Zap className="w-6 h-6 text-accent" />,
      title: 'AI Credit Scoring',
      description: 'Fair assessment based on affordability, not just credit history.',
    },
    {
      icon: <Clock className="w-6 h-6 text-accent" />,
      title: 'Fast Approval',
      description: 'Get approved in as little as 24 hours and drive away sooner.',
    },
  ];

  return (
    <main className="min-h-screen bg-bg-primary selection:bg-primary/30">
      <Navigation />

      <Hero />

      {/* Steps Section */}
      <section className="section-padding relative overflow-hidden" id="how-it-works">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-text-secondary text-lg">
              Your path to car ownership is simpler than you think. Just three easy steps to get on the road.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent border-t border-dashed border-primary/30 z-0" />

            {steps.map((step, index) => (
              <div key={index} className="relative z-10 flex flex-col items-center text-center group">
                <div className="w-24 h-24 rounded-2xl bg-bg-secondary border border-border-secondary flex items-center justify-center mb-6 shadow-lg shadow-primary/5 group-hover:shadow-primary/20 group-hover:border-primary/50 transition-all duration-500">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-text-secondary leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Vehicles */}
      <section className="section-padding bg-bg-secondary/30 border-y border-border-primary">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Vehicles</h2>
              <p className="text-text-secondary text-lg">
                Explore our latest additions, fully inspected and ready to drive.
              </p>
            </div>
            <Link href="/search">
              <Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
                View All Cars
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[400px] rounded-2xl bg-bg-secondary animate-pulse" />
              ))}
            </div>
          ) : vehicles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {vehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  id={vehicle.id}
                  make={vehicle.make}
                  model={vehicle.model}
                  year={vehicle.year}
                  pricePerWeek={vehicle.weekly_payment || Math.round(vehicle.price / 52)}
                  image={vehicle.images?.[0] || 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?q=80&w=1000&auto=format&fit=crop'}
                  transmission={vehicle.transmission || 'Automatic'}
                  fuelType={vehicle.fuel_type || 'Petrol'}
                  mileage={vehicle.mileage || 0}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-text-secondary">No vehicles available at the moment. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-padding">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              {/* Placeholder for benefits image */}
              <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-border-secondary overflow-hidden relative">
                <div className="absolute inset-0 bg-grid-white/[0.02]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldCheck className="w-32 h-32 text-primary/20" />
                </div>
              </div>
              {/* Floating Card */}
              <div className="absolute -bottom-8 -right-8 bg-bg-secondary/90 backdrop-blur-xl p-6 rounded-2xl border border-border-glass shadow-xl max-w-xs animate-float">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Approved!</p>
                    <p className="text-xs text-text-muted">Just now</p>
                  </div>
                </div>
                <p className="text-sm text-text-secondary">"AutoLadder helped me get a car when no one else would. Highly recommended!"</p>
              </div>
            </div>

            <div className="space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold">
                Why Choose <span className="text-primary">AutoLadder</span>?
              </h2>
              <p className="text-text-secondary text-lg leading-relaxed">
                We believe everyone deserves a chance to own a reliable vehicle. Our technology-driven approach makes the process transparent, fair, and fast.
              </p>

              <div className="space-y-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      {benefit.icon}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold mb-1">{benefit.title}</h4>
                      <p className="text-text-secondary">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/auth/login">
                <Button size="lg" className="mt-4">
                  Start Your Journey
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
