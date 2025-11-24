import React from 'react';
import Image from 'next/image';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Search, MapPin, DollarSign, Car } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-bg-primary z-0">
        <div className="absolute top-0 right-0 w-2/3 h-full bg-hero-glow opacity-60" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-radial from-accent/5 to-transparent opacity-40" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              The Smarter Way to Own a Car
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Drive Today, <br />
              <span className="text-gradient">Own Tomorrow</span>
            </h1>

            <p className="text-lg text-text-secondary max-w-xl leading-relaxed">
              Flexible rent-to-own plans designed around your budget. No hidden fees, AI-powered approval, and a path to ownership that actually works.
            </p>

            {/* Search Filter Card */}
            <div className="bg-bg-secondary/80 backdrop-blur-md border border-border-glass p-6 rounded-2xl shadow-glass max-w-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Input
                  placeholder="Location"
                  leftIcon={<MapPin className="w-4 h-4" />}
                  className="bg-bg-tertiary border-transparent focus:bg-bg-secondary"
                />
                <Input
                  placeholder="Budget"
                  leftIcon={<DollarSign className="w-4 h-4" />}
                  className="bg-bg-tertiary border-transparent focus:bg-bg-secondary"
                />
                <Input
                  placeholder="Model"
                  leftIcon={<Car className="w-4 h-4" />}
                  className="bg-bg-tertiary border-transparent focus:bg-bg-secondary"
                />
              </div>
              <div className="flex gap-4">
                <Button className="flex-1" rightIcon={<Search className="w-4 h-4" />}>
                  Find Your Car
                </Button>
                <Button variant="outline" className="flex-1">
                  Get Started
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-8 pt-4">
              <div>
                <p className="text-3xl font-bold text-white">2k+</p>
                <p className="text-sm text-text-muted">Cars Available</p>
              </div>
              <div className="w-px h-10 bg-border-secondary" />
              <div>
                <p className="text-3xl font-bold text-white">98%</p>
                <p className="text-sm text-text-muted">Approval Rate</p>
              </div>
              <div className="w-px h-10 bg-border-secondary" />
              <div>
                <p className="text-3xl font-bold text-white">24h</p>
                <p className="text-sm text-text-muted">Fast Delivery</p>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative lg:h-[800px] flex items-center justify-center animate-fade-in">
            <div className="relative w-full aspect-square md:aspect-auto md:h-full">
              {/* Placeholder for the car image - using a div for now or a generic placeholder if I don't have the asset. 
                   I will use a gradient circle as a placeholder for the car if no image is available, 
                   but the prompt asked for "Full-width hero banner with a car and a smiling customer".
                   I'll use a placeholder image from a public source or just a colored block if I can't access external URLs.
                   Actually, I should use the generate_image tool if I needed an asset, but I already generated a mockup.
                   I will use a placeholder div with a descriptive alt text or a standard placeholder URL if allowed.
                   Since I can't fetch external URLs easily without knowing if they are valid, I will use a local placeholder path 
                   and assume the user will replace it, or use a standard placeholder service if I could.
                   I'll use a colored div with text for now to represent the image.
               */}
              <div className="absolute inset-0 bg-gradient-radial from-primary/20 to-transparent opacity-50 blur-3xl" />
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                {/* In a real app, this would be: <Image src="/hero-car.png" ... /> */}
                <div className="w-full h-4/5 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl border border-border-glass flex items-center justify-center relative overflow-hidden shadow-2xl animate-float">
                  <div className="absolute inset-0 bg-bg-secondary/50" />
                  <p className="relative z-10 text-text-muted font-medium">[Hero Image: Modern SUV & Customer]</p>
                  {/* Decorative elements to make it look "premium" even as a placeholder */}
                  <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl" />
                  <div className="absolute -top-20 -left-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
