'use client';

import React, { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Users, Search, Filter, Eye, Ban, CheckCircle } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    phone: string;
    kyc_status: string;
    created_at: string;
}

export default function AdminUsersPage() {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || user?.role !== 'admin')) {
            router.push('/auth/login');
        }
    }, [isAuthenticated, user, authLoading, router]);

    useEffect(() => {
        if (isAuthenticated && user?.role === 'admin') {
            fetchUsers();
        }
    }, [isAuthenticated, user]);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data.success ? (data.data.users || data.data || []) : []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch =
            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const stats = {
        total: users.length,
        customers: users.filter(u => u.role === 'customer').length,
        retailers: users.filter(u => u.role === 'retailer').length,
        admins: users.filter(u => u.role === 'admin').length,
    };

    if (authLoading || loading) {
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
                <div className="container mx-auto px-4 md:px-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
                        <p className="text-text-secondary">View and manage all platform users</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Card className="p-6 bg-bg-secondary border border-border-secondary">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-primary" />
                                </div>
                            </div>
                            <p className="text-text-muted text-sm mb-1">Total Users</p>
                            <p className="text-3xl font-bold text-white">{stats.total}</p>
                        </Card>

                        <Card className="p-6 bg-bg-secondary border border-border-secondary">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-blue-500" />
                                </div>
                            </div>
                            <p className="text-text-muted text-sm mb-1">Customers</p>
                            <p className="text-3xl font-bold text-white">{stats.customers}</p>
                        </Card>

                        <Card className="p-6 bg-bg-secondary border border-border-secondary">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-accent" />
                                </div>
                            </div>
                            <p className="text-text-muted text-sm mb-1">Retailers</p>
                            <p className="text-3xl font-bold text-white">{stats.retailers}</p>
                        </Card>

                        <Card className="p-6 bg-bg-secondary border border-border-secondary">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-green-500" />
                                </div>
                            </div>
                            <p className="text-text-muted text-sm mb-1">Admins</p>
                            <p className="text-3xl font-bold text-white">{stats.admins}</p>
                        </Card>
                    </div>

                    {/* Filters */}
                    <Card className="p-6 bg-bg-secondary border border-border-secondary mb-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    leftIcon={<Search className="w-4 h-4" />}
                                    fullWidth
                                />
                            </div>
                            <div className="w-full md:w-48">
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="w-full px-4 py-3 bg-bg-tertiary border border-border-secondary rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="all">All Roles</option>
                                    <option value="customer">Customers</option>
                                    <option value="retailer">Retailers</option>
                                    <option value="admin">Admins</option>
                                </select>
                            </div>
                        </div>
                    </Card>

                    {/* Users Table */}
                    <Card className="bg-bg-secondary border border-border-secondary overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-bg-tertiary border-b border-border-secondary">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                            KYC Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                            Joined
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-secondary">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <Users className="w-12 h-12 text-text-muted mx-auto mb-3" />
                                                <p className="text-text-secondary">No users found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-bg-tertiary/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-semibold text-white">
                                                            {u.first_name} {u.last_name}
                                                        </p>
                                                        <p className="text-sm text-text-muted">{u.email}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${u.role === 'admin'
                                                        ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                                                        : u.role === 'retailer'
                                                            ? 'bg-accent/20 text-accent border border-accent/30'
                                                            : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                                                        }`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${u.kyc_status === 'verified'
                                                        ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                                                        : u.kyc_status === 'pending'
                                                            ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                                                            : 'bg-gray-500/20 text-gray-500 border border-gray-500/30'
                                                        }`}>
                                                        {u.kyc_status || 'not started'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-text-secondary">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <Button variant="ghost" size="sm" leftIcon={<Eye className="w-4 h-4" />}>
                                                            View
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>

            <Footer />
        </main>
    );
}
