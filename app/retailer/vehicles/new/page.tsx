'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { ImageUpload } from '@/components/ImageUpload';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function NewVehiclePage() {
    const router = useRouter();
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [images, setImages] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        vehicleType: 'car',
        price: '',
        depositAmount: '',
        monthlyPayment: '',
        weeklyPayment: '',
        mileage: '',
        transmission: 'automatic',
        fuelType: 'petrol',
        color: '',
        vin: '',
        description: '',
    });

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || user?.role !== 'retailer')) {
            router.push('/auth/login');
        }
    }, [isAuthenticated, user, authLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (images.length === 0) {
            setError('Please upload at least one image');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/cars', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: JSON.stringify({
                    ...formData,
                    price: parseFloat(formData.price),
                    depositAmount: parseFloat(formData.depositAmount),
                    monthlyPayment: parseFloat(formData.monthlyPayment),
                    weeklyPayment: parseFloat(formData.weeklyPayment),
                    mileage: parseInt(formData.mileage),
                    year: parseInt(formData.year.toString()),
                    images,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                router.push('/retailer/dashboard');
            } else {
                setError(data.error || 'Failed to create vehicle');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-text-secondary">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-bg-primary">
            <Navigation />

            <div className="pt-24 pb-12">
                <div className="container mx-auto px-4 md:px-6 max-w-4xl">
                    {/* Header */}
                    <div className="mb-8">
                        <Link href="/retailer/dashboard">
                            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                                Back to Dashboard
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold text-white mt-4 mb-2">Add New Vehicle</h1>
                        <p className="text-text-secondary">Fill in the details to list a new vehicle</p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Images */}
                        <Card className="p-6 bg-bg-secondary border border-border-secondary">
                            <h2 className="text-xl font-bold text-white mb-4">Vehicle Images</h2>
                            <ImageUpload images={images} onChange={setImages} maxImages={10} />
                        </Card>

                        {/* Basic Information */}
                        <Card className="p-6 bg-bg-secondary border border-border-secondary">
                            <h2 className="text-xl font-bold text-white mb-4">Basic Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Make"
                                    required
                                    value={formData.make}
                                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                                    placeholder="e.g., Toyota"
                                    fullWidth
                                />
                                <Input
                                    label="Model"
                                    required
                                    value={formData.model}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    placeholder="e.g., Camry"
                                    fullWidth
                                />
                                <Input
                                    label="Year"
                                    type="number"
                                    required
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                    fullWidth
                                />
                                <Select
                                    label="Vehicle Type"
                                    value={formData.vehicleType}
                                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                                    options={[
                                        { value: 'car', label: 'Car' },
                                        { value: 'truck', label: 'Truck' },
                                        { value: 'van', label: 'Van' },
                                        { value: 'suv', label: 'SUV' },
                                        { value: 'motorcycle', label: 'Motorcycle' },
                                    ]}
                                    fullWidth
                                />
                                <Input
                                    label="Mileage"
                                    type="number"
                                    required
                                    value={formData.mileage}
                                    onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                                    placeholder="e.g., 45000"
                                    fullWidth
                                />
                                <Input
                                    label="Color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    placeholder="e.g., Silver"
                                    fullWidth
                                />
                                <Select
                                    label="Transmission"
                                    value={formData.transmission}
                                    onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                                    options={[
                                        { value: 'automatic', label: 'Automatic' },
                                        { value: 'manual', label: 'Manual' },
                                    ]}
                                    fullWidth
                                />
                                <Select
                                    label="Fuel Type"
                                    value={formData.fuelType}
                                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                                    options={[
                                        { value: 'petrol', label: 'Petrol' },
                                        { value: 'diesel', label: 'Diesel' },
                                        { value: 'electric', label: 'Electric' },
                                        { value: 'hybrid', label: 'Hybrid' },
                                    ]}
                                    fullWidth
                                />
                                <Input
                                    label="VIN (Optional)"
                                    value={formData.vin}
                                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                                    placeholder="Vehicle Identification Number"
                                    fullWidth
                                    className="md:col-span-2"
                                />
                            </div>
                        </Card>

                        {/* Pricing */}
                        <Card className="p-6 bg-bg-secondary border border-border-secondary">
                            <h2 className="text-xl font-bold text-white mb-4">Pricing & Payments</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Total Price"
                                    type="number"
                                    required
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="e.g., 25000"
                                    leftIcon={<span className="text-text-muted">$</span>}
                                    fullWidth
                                />
                                <Input
                                    label="Deposit Amount"
                                    type="number"
                                    required
                                    value={formData.depositAmount}
                                    onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                                    placeholder="e.g., 2500"
                                    leftIcon={<span className="text-text-muted">$</span>}
                                    fullWidth
                                />
                                <Input
                                    label="Weekly Payment"
                                    type="number"
                                    required
                                    value={formData.weeklyPayment}
                                    onChange={(e) => setFormData({ ...formData, weeklyPayment: e.target.value })}
                                    placeholder="e.g., 150"
                                    leftIcon={<span className="text-text-muted">$</span>}
                                    fullWidth
                                />
                                <Input
                                    label="Monthly Payment"
                                    type="number"
                                    required
                                    value={formData.monthlyPayment}
                                    onChange={(e) => setFormData({ ...formData, monthlyPayment: e.target.value })}
                                    placeholder="e.g., 650"
                                    leftIcon={<span className="text-text-muted">$</span>}
                                    fullWidth
                                />
                            </div>
                        </Card>

                        {/* Description */}
                        <Card className="p-6 bg-bg-secondary border border-border-secondary">
                            <h2 className="text-xl font-bold text-white mb-4">Description</h2>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe the vehicle's condition, features, and any additional information..."
                                rows={5}
                                className="w-full px-4 py-3 bg-bg-tertiary border border-border-secondary rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                            />
                        </Card>

                        {/* Submit */}
                        <div className="flex gap-4">
                            <Button
                                type="submit"
                                size="lg"
                                className="flex-1"
                                isLoading={loading}
                                leftIcon={<Save className="w-5 h-5" />}
                            >
                                {loading ? 'Creating...' : 'Create Vehicle'}
                            </Button>
                            <Link href="/retailer/dashboard" className="flex-1">
                                <Button type="button" variant="outline" size="lg" className="w-full">
                                    Cancel
                                </Button>
                            </Link>
                        </div>
                    </form>
                </div>
            </div>

            <Footer />
        </main>
    );
}
