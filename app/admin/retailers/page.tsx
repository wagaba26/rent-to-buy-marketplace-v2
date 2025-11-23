'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Retailer {
    id: string;
    business_name: string;
    trading_license: string;
    business_type: string;
    status: string;
    email: string;
    created_at: string;
}

export default function AdminRetailersPage() {
    const router = useRouter();
    const [retailers, setRetailers] = useState<Retailer[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
    const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');

    useEffect(() => {
        fetchRetailers();
    }, [filter]);

    const fetchRetailers = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/admin/retailers?status=${filter}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setRetailers(data.data.retailers);
            }
        } catch (error) {
            console.error('Error fetching retailers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (retailerId: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/retailers/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ retailerId }),
            });

            if (response.ok) {
                alert('Retailer approved successfully!');
                fetchRetailers();
            }
        } catch (error) {
            alert('Error approving retailer');
        }
    };

    const handleDeny = async (retailerId: string) => {
        const reason = prompt('Enter denial reason:');
        if (!reason) return;

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/retailers/deny', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ retailerId, reason }),
            });

            if (response.ok) {
                alert('Retailer denied');
                fetchRetailers();
            }
        } catch (error) {
            alert('Error denying retailer');
        }
    };

    const handleGenerateAccessCode = async (retailerId: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/retailers/generate-access-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ retailerId, expiresInDays: 30 }),
            });

            const data = await response.json();
            if (data.success) {
                setGeneratedCode(data.data.accessCode);
                setShowAccessCodeModal(true);
            }
        } catch (error) {
            alert('Error generating access code');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Retailer Management</h1>
                    <p className="text-gray-600">Approve, deny, and manage retailer applications</p>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="flex border-b">
                        {['pending', 'approved', 'denied'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-6 py-3 font-medium capitalize ${filter === status
                                        ? 'border-b-2 border-indigo-600 text-indigo-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Retailers Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading...</div>
                    ) : retailers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No {filter} retailers found</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {retailers.map((retailer) => (
                                    <tr key={retailer.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{retailer.business_name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{retailer.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{retailer.trading_license}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                                            {retailer.business_type.replace('_', ' ')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 text-xs font-semibold rounded-full ${retailer.status === 'approved'
                                                        ? 'bg-green-100 text-green-800'
                                                        : retailer.status === 'denied'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}
                                            >
                                                {retailer.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {retailer.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApprove(retailer.id)}
                                                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeny(retailer.id)}
                                                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                                    >
                                                        Deny
                                                    </button>
                                                </div>
                                            )}
                                            {retailer.status === 'approved' && (
                                                <button
                                                    onClick={() => handleGenerateAccessCode(retailer.id)}
                                                    className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                                >
                                                    Generate Code
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Access Code Modal */}
            {showAccessCodeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-8 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Access Code Generated</h3>
                        <div className="bg-gray-100 p-4 rounded-lg mb-4">
                            <p className="text-sm text-gray-600 mb-2">One-time access code:</p>
                            <p className="text-2xl font-mono font-bold text-indigo-600 text-center tracking-wider">{generatedCode}</p>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-yellow-800">
                                ⚠️ This code will only be shown once. Make sure to copy it and send it to the retailer.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(generatedCode);
                                    alert('Copied to clipboard!');
                                }}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                                Copy Code
                            </button>
                            <button
                                onClick={() => {
                                    setShowAccessCodeModal(false);
                                    setGeneratedCode('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
