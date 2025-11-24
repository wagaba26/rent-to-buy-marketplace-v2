'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ImageUpload } from '@/components/ImageUpload';
import {
    FileText,
    Upload,
    CheckCircle,
    Clock,
    AlertCircle,
    User,
    Home,
    DollarSign
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

type KYCStep = 'personal' | 'identity' | 'address' | 'income' | 'review';

interface KYCData {
    // Personal
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nin: string;
    phone: string;

    // Identity Documents
    identityDocuments: string[];

    // Address
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    addressDocuments: string[];

    // Income
    employmentStatus: string;
    monthlyIncome: string;
    incomeDocuments: string[];
}

export default function KYCPage() {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<KYCStep>('personal');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [kycStatus, setKycStatus] = useState<string | null>(null);

    const [formData, setFormData] = useState<KYCData>({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        nin: '',
        phone: '',
        identityDocuments: [],
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        addressDocuments: [],
        employmentStatus: 'employed',
        monthlyIncome: '',
        incomeDocuments: [],
    });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/auth/login');
        }
    }, [isAuthenticated, authLoading, router]);

    useEffect(() => {
        if (isAuthenticated) {
            checkKYCStatus();
        }
    }, [isAuthenticated]);

    const checkKYCStatus = async () => {
        try {
            const response = await fetch('/api/kyc/status', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data.status) {
                    setKycStatus(data.data.status);
                }
            }
        } catch (error) {
            console.error('Error checking KYC status:', error);
        }
    };

    const handleSubmit = async () => {
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/kyc/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setKycStatus('pending');
                alert('KYC verification submitted successfully! We will review your documents shortly.');
                router.push('/dashboard');
            } else {
                setError(data.error || 'Failed to submit KYC');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const steps: { id: KYCStep; title: string; icon: any }[] = [
        { id: 'personal', title: 'Personal Info', icon: User },
        { id: 'identity', title: 'Identity', icon: FileText },
        { id: 'address', title: 'Address', icon: Home },
        { id: 'income', title: 'Income', icon: DollarSign },
        { id: 'review', title: 'Review', icon: CheckCircle },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === currentStep);

    const nextStep = () => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < steps.length) {
            setCurrentStep(steps[nextIndex].id);
        }
    };

    const prevStep = () => {
        const prevIndex = currentStepIndex - 1;
        if (prevIndex >= 0) {
            setCurrentStep(steps[prevIndex].id);
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

    // Show status if already submitted
    if (kycStatus && kycStatus !== 'not_started') {
        return (
            <main className="min-h-screen bg-bg-primary">
                <Navigation />

                <div className="pt-24 pb-12">
                    <div className="container mx-auto px-4 md:px-6 max-w-2xl">
                        <Card className="p-8 bg-bg-secondary border border-border-secondary text-center">
                            {kycStatus === 'pending' && (
                                <>
                                    <Clock className="w-16 h-16 text-accent mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold text-white mb-2">KYC Under Review</h2>
                                    <p className="text-text-secondary mb-6">
                                        Your KYC verification is being reviewed. We'll notify you once it's complete.
                                    </p>
                                </>
                            )}
                            {kycStatus === 'verified' && (
                                <>
                                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold text-white mb-2">KYC Verified</h2>
                                    <p className="text-text-secondary mb-6">
                                        Your identity has been verified. You can now apply for vehicles.
                                    </p>
                                </>
                            )}
                            {kycStatus === 'rejected' && (
                                <>
                                    <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold text-white mb-2">KYC Rejected</h2>
                                    <p className="text-text-secondary mb-6">
                                        Your KYC verification was rejected. Please contact support for more information.
                                    </p>
                                </>
                            )}
                            <Button onClick={() => router.push('/dashboard')}>
                                Go to Dashboard
                            </Button>
                        </Card>
                    </div>
                </div>

                <Footer />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-bg-primary">
            <Navigation />

            <div className="pt-24 pb-12">
                <div className="container mx-auto px-4 md:px-6 max-w-4xl">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-white mb-2">KYC Verification</h1>
                        <p className="text-text-secondary">Complete your identity verification to apply for vehicles</p>
                    </div>

                    {/* Progress Steps */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            {steps.map((step, index) => {
                                const Icon = step.icon;
                                const isActive = currentStep === step.id;
                                const isCompleted = index < currentStepIndex;

                                return (
                                    <div key={step.id} className="flex-1 flex items-center">
                                        <div className="flex flex-col items-center flex-1">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${isActive
                                                ? 'bg-primary text-white ring-4 ring-primary/20'
                                                : isCompleted
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-bg-tertiary text-text-muted'
                                                }`}>
                                                {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                                            </div>
                                            <p className={`text-xs font-medium ${isActive ? 'text-primary' : isCompleted ? 'text-green-500' : 'text-text-muted'
                                                }`}>
                                                {step.title}
                                            </p>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div className={`h-1 flex-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-bg-tertiary'
                                                }`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl">
                            {error}
                        </div>
                    )}

                    {/* Form Content */}
                    <Card className="p-8 bg-bg-secondary border border-border-secondary">
                        {currentStep === 'personal' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-white mb-4">Personal Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="First Name"
                                        required
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        fullWidth
                                    />
                                    <Input
                                        label="Last Name"
                                        required
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        fullWidth
                                    />
                                    <Input
                                        label="Date of Birth"
                                        type="date"
                                        required
                                        value={formData.dateOfBirth}
                                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                        fullWidth
                                    />
                                    <Input
                                        label="National ID Number"
                                        required
                                        value={formData.nin}
                                        onChange={(e) => setFormData({ ...formData, nin: e.target.value })}
                                        placeholder="e.g., CM12345678"
                                        fullWidth
                                    />
                                    <Input
                                        label="Phone Number"
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+237 XXX XXX XXX"
                                        fullWidth
                                        className="md:col-span-2"
                                    />
                                </div>
                            </div>
                        )}

                        {currentStep === 'identity' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-white mb-4">Identity Documents</h2>
                                <p className="text-text-secondary mb-4">
                                    Upload a clear photo of your National ID Card or Passport
                                </p>
                                <ImageUpload
                                    images={formData.identityDocuments}
                                    onChange={(images) => setFormData({ ...formData, identityDocuments: images })}
                                    maxImages={2}
                                />
                            </div>
                        )}

                        {currentStep === 'address' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-white mb-4">Address Verification</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <Input
                                        label="Address Line 1"
                                        required
                                        value={formData.addressLine1}
                                        onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                                        fullWidth
                                        className="md:col-span-2"
                                    />
                                    <Input
                                        label="Address Line 2"
                                        value={formData.addressLine2}
                                        onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                                        fullWidth
                                        className="md:col-span-2"
                                    />
                                    <Input
                                        label="City"
                                        required
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        fullWidth
                                    />
                                    <Input
                                        label="State/Region"
                                        required
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        fullWidth
                                    />
                                    <Input
                                        label="Postal Code"
                                        value={formData.postalCode}
                                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                        fullWidth
                                    />
                                </div>
                                <div>
                                    <p className="text-text-secondary mb-4">
                                        Upload proof of address (utility bill, bank statement, etc.)
                                    </p>
                                    <ImageUpload
                                        images={formData.addressDocuments}
                                        onChange={(images) => setFormData({ ...formData, addressDocuments: images })}
                                        maxImages={2}
                                    />
                                </div>
                            </div>
                        )}

                        {currentStep === 'income' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-white mb-4">Income Verification</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-text-secondary mb-2">
                                            Employment Status
                                        </label>
                                        <select
                                            value={formData.employmentStatus}
                                            onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                                            className="w-full px-4 py-3 bg-bg-tertiary border border-border-secondary rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="employed">Employed</option>
                                            <option value="self-employed">Self-Employed</option>
                                            <option value="business-owner">Business Owner</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <Input
                                        label="Monthly Income (XAF)"
                                        type="number"
                                        required
                                        value={formData.monthlyIncome}
                                        onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                                        placeholder="e.g., 500000"
                                        fullWidth
                                        className="md:col-span-2"
                                    />
                                </div>
                                <div>
                                    <p className="text-text-secondary mb-4">
                                        Upload proof of income (payslip, bank statement, tax return, etc.)
                                    </p>
                                    <ImageUpload
                                        images={formData.incomeDocuments}
                                        onChange={(images) => setFormData({ ...formData, incomeDocuments: images })}
                                        maxImages={3}
                                    />
                                </div>
                            </div>
                        )}

                        {currentStep === 'review' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-white mb-4">Review & Submit</h2>
                                <div className="space-y-4">
                                    <div className="p-4 bg-bg-tertiary rounded-xl">
                                        <h3 className="font-semibold text-white mb-2">Personal Information</h3>
                                        <p className="text-text-secondary text-sm">
                                            {formData.firstName} {formData.lastName}<br />
                                            DOB: {formData.dateOfBirth}<br />
                                            NIN: {formData.nin}<br />
                                            Phone: {formData.phone}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-bg-tertiary rounded-xl">
                                        <h3 className="font-semibold text-white mb-2">Documents Uploaded</h3>
                                        <p className="text-text-secondary text-sm">
                                            Identity Documents: {formData.identityDocuments.length}<br />
                                            Address Documents: {formData.addressDocuments.length}<br />
                                            Income Documents: {formData.incomeDocuments.length}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                                        <p className="text-sm text-text-secondary">
                                            By submitting this form, you confirm that all information provided is accurate and you consent to the verification of your documents.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex gap-4 mt-8">
                            {currentStepIndex > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={prevStep}
                                    className="flex-1"
                                >
                                    Previous
                                </Button>
                            )}
                            {currentStepIndex < steps.length - 1 ? (
                                <Button
                                    type="button"
                                    onClick={nextStep}
                                    className="flex-1"
                                >
                                    Next
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={handleSubmit}
                                    isLoading={loading}
                                    className="flex-1"
                                >
                                    {loading ? 'Submitting...' : 'Submit for Verification'}
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            <Footer />
        </main>
    );
}
