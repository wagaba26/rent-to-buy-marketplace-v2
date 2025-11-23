'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    price: number;
    depositAmount: number;
    monthlyPayment: number;
    paymentTermMonths: number;
    images?: string[];
}

export default function ApplyPage() {
    const router = useRouter();
    const params = useParams();
    const vehicleId = params.id as string;

    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        employmentStatus: 'employed',
        monthlyIncome: '',
        incomeVerification: '',
    });

    useEffect(() => {
        fetchVehicle();
    }, [vehicleId]);

    const fetchVehicle = async () => {
        try {
            const response = await fetch(`/api/cars/${vehicleId}`);
            const data = await response.json();
            if (data.success) {
                setVehicle(data.data.vehicle);
            }
        } catch (error) {
            console.error('Error fetching vehicle:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/applications/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    vehicleId,
                    employmentStatus: formData.employmentStatus,
                    monthlyIncome: parseFloat(formData.monthlyIncome),
                    incomeVerification: formData.incomeVerification,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
            } else {
                alert(data.error?.message || 'Application failed');
            }
        } catch (error) {
            alert('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading vehicle details...</p>
                </div>
            </div>
        );
    }

    if (!vehicle) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 text-lg">Vehicle not found</p>
                    <button onClick={() => router.push('/vehicles')} className="mt-4 text-indigo-600 hover:text-indigo-700">
                        Back to Vehicles
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
                    <p className="text-gray-600 mb-6">
                        Your rent-to-buy application has been submitted successfully. We'll review it and get back to you soon.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm text-blue-800 mb-2">
                            <strong>Next Steps:</strong>
                        </p>
                        <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                            <li>We'll review your application</li>
                            <li>Check your credit score</li>
                            <li>Contact you within 24-48 hours</li>
                        </ol>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700"
                        >
                            View My Applications
                        </button>
                        <button
                            onClick={() => router.push('/vehicles')}
                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                        >
                            Browse More
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Vehicle Summary */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Vehicle Details</h2>
                    <div className="flex items-center gap-6">
                        <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                            </h3>
                            <div className="mt-2 grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Total Price</p>
                                    <p className="text-lg font-bold text-gray-900">${vehicle.price.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Deposit</p>
                                    <p className="text-lg font-bold text-gray-900">${vehicle.depositAmount.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Monthly Payment</p>
                                    <p className="text-lg font-bold text-indigo-600">${vehicle.monthlyPayment.toLocaleString()}/mo</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Application Form */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Apply for Rent-to-Buy</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status</label>
                            <select
                                value={formData.employmentStatus}
                                onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="employed">Employed (Full-time)</option>
                                <option value="part_time">Employed (Part-time)</option>
                                <option value="self_employed">Self-employed</option>
                                <option value="unemployed">Unemployed</option>
                                <option value="student">Student</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Income</label>
                            <div className="relative">
                                <span className="absolute left-4 top-3 text-gray-500">$</span>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.monthlyIncome}
                                    onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="mt-1 text-sm text-gray-500">Enter your gross monthly income</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Income Verification (Optional)
                            </label>
                            <textarea
                                value={formData.incomeVerification}
                                onChange={(e) => setFormData({ ...formData, incomeVerification: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="e.g., Employer name, pay stub details, or other verification information"
                            />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>✓ We'll review your application within 24-48 hours</li>
                                <li>✓ Credit check will be performed</li>
                                <li>✓ You'll be notified via email about the decision</li>
                                <li>✓ If approved, you can proceed with the deposit payment</li>
                            </ul>
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Submitting...' : 'Submit Application'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
