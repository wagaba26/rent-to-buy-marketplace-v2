'use client';

import React from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Car, Calendar, CreditCard, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';

export const Dashboard = () => {
    // Mock data
    const user = { name: 'Alex' };
    const vehicle = {
        make: 'Tesla',
        model: 'Model Y',
        year: 2023,
        image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?q=80&w=1000&auto=format&fit=crop',
        status: 'Active',
        nextPayment: 185,
        dueDate: 'Nov 28, 2025',
        progress: 35, // percentage
        totalPaid: 12500,
        remaining: 32500,
    };

    const payments = [
        { id: 1, date: 'Nov 21, 2025', amount: 185, status: 'Paid' },
        { id: 2, date: 'Nov 14, 2025', amount: 185, status: 'Paid' },
        { id: 3, date: 'Nov 07, 2025', amount: 185, status: 'Paid' },
        { id: 4, date: 'Oct 31, 2025', amount: 185, status: 'Paid' },
    ];

    return (
        <div className="min-h-screen bg-bg-primary pt-24 pb-12">
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-1">Welcome back, {user.name}</h1>
                        <p className="text-text-secondary">Here's your ownership progress.</p>
                    </div>
                    <Button size="sm" variant="outline">
                        Need Help?
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Progress Card */}
                    <div className="lg:col-span-2 space-y-8">
                        <Card glass className="p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                {/* Circular Progress */}
                                <div className="relative w-48 h-48 shrink-0">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            cx="96"
                                            cy="96"
                                            r="88"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            fill="transparent"
                                            className="text-bg-tertiary"
                                        />
                                        <circle
                                            cx="96"
                                            cy="96"
                                            r="88"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            fill="transparent"
                                            strokeDasharray={2 * Math.PI * 88}
                                            strokeDashoffset={2 * Math.PI * 88 * (1 - vehicle.progress / 100)}
                                            className="text-primary transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-bold text-white">{vehicle.progress}%</span>
                                        <span className="text-sm text-text-secondary">Owned</span>
                                    </div>
                                </div>

                                <div className="flex-1 text-center md:text-left">
                                    <h2 className="text-2xl font-bold mb-2">Keep it up!</h2>
                                    <p className="text-text-secondary mb-6">
                                        You're on track to own your {vehicle.make} {vehicle.model} by August 2027.
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-bg-tertiary/50 p-4 rounded-xl border border-border-secondary">
                                            <p className="text-sm text-text-secondary mb-1">Total Paid</p>
                                            <p className="text-xl font-bold text-white">${vehicle.totalPaid.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-bg-tertiary/50 p-4 rounded-xl border border-border-secondary">
                                            <p className="text-sm text-text-secondary mb-1">Remaining</p>
                                            <p className="text-xl font-bold text-white">${vehicle.remaining.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Vehicle Status */}
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold">Vehicle Status</h3>
                                <span className="px-3 py-1 rounded-full bg-success/10 text-success text-sm font-bold border border-success/20 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                    {vehicle.status}
                                </span>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                <div className="relative w-full md:w-1/3 aspect-video rounded-xl overflow-hidden">
                                    <img src={vehicle.image} alt="Vehicle" className="object-cover w-full h-full" />
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-primary">
                                            <Car className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-secondary">Vehicle</p>
                                            <p className="font-bold text-white">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-primary">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-secondary">Next Service</p>
                                            <p className="font-bold text-white">In 3,000 km</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-8">
                        {/* Next Payment */}
                        <Card className="p-6 bg-gradient-to-br from-bg-secondary to-bg-tertiary border-border-accent">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-accent" />
                                Next Payment
                            </h3>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-4xl font-bold text-white">${vehicle.nextPayment}</span>
                                <span className="text-text-secondary mb-1">Due {vehicle.dueDate}</span>
                            </div>
                            <div className="h-2 bg-bg-primary rounded-full mb-6 overflow-hidden">
                                <div className="h-full bg-accent w-3/4 rounded-full" />
                            </div>
                            <Button className="w-full">Pay Now</Button>
                        </Card>

                        {/* Payment History */}
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold">Recent Payments</h3>
                                <Button variant="ghost" size="sm" className="text-xs">View All</Button>
                            </div>
                            <div className="space-y-4">
                                {payments.map((payment) => (
                                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-bg-tertiary transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-white">${payment.amount}</p>
                                                <p className="text-xs text-text-secondary">{payment.date}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-text-tertiary" />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};
