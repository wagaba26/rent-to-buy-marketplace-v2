'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Car, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAccessCode, setShowAccessCode] = useState(false);
    const [showMFA, setShowMFA] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        accessCode: '',
        mfaToken: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(
                formData.email,
                formData.password,
                formData.accessCode || undefined,
                formData.mfaToken || undefined
            );

            if (!result.success) {
                if (result.requiresMFA) {
                    setShowMFA(true);
                    setError('');
                } else if (result.requiresAccessCode) {
                    setShowAccessCode(true);
                    setError('Access code is required for retailer login');
                } else {
                    setError(result.error || 'Login failed');
                }
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-primary relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0">
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-hero-glow opacity-40" />
                <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-radial from-accent/10 to-transparent opacity-30" />
            </div>

            <div className="max-w-md w-full relative z-10 px-4">
                {/* Logo/Brand */}
                <div className="text-center mb-8 animate-fade-in">
                    <Link href="/" className="inline-flex items-center gap-2 group mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all">
                            <Car className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-3xl font-bold font-heading text-white tracking-tight">
                            Auto<span className="text-primary">Ladder</span>
                        </span>
                    </Link>
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                    <p className="text-text-secondary">Sign in to your account</p>
                </div>

                {/* Login Card */}
                <div className="bg-bg-secondary/80 backdrop-blur-xl border border-border-glass rounded-3xl shadow-glass p-8 animate-scale-in">
                    {error && (
                        <div className="mb-6 bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {showMFA && (
                        <div className="mb-6 bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-xl text-sm">
                            Please enter your 6-digit MFA code from your authenticator app
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Email Address"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="you@example.com"
                            leftIcon={<Mail className="w-4 h-4" />}
                            fullWidth
                        />

                        <Input
                            label="Password"
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                            leftIcon={<Lock className="w-4 h-4" />}
                            fullWidth
                        />

                        {showAccessCode && (
                            <div className="animate-fade-in-up">
                                <Input
                                    label="Access Code"
                                    helperText="Enter the access code provided by admin"
                                    type="text"
                                    required={showAccessCode}
                                    value={formData.accessCode}
                                    onChange={(e) => setFormData({ ...formData, accessCode: e.target.value.toUpperCase() })}
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    className="font-mono"
                                    fullWidth
                                />
                            </div>
                        )}

                        {showMFA && (
                            <div className="animate-fade-in-up">
                                <Input
                                    label="MFA Code"
                                    type="text"
                                    required={showMFA}
                                    value={formData.mfaToken}
                                    onChange={(e) => setFormData({ ...formData, mfaToken: e.target.value })}
                                    placeholder="000000"
                                    className="font-mono text-center text-2xl tracking-widest"
                                    fullWidth
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center cursor-pointer">
                                <input type="checkbox" className="rounded border-border-secondary bg-bg-tertiary text-primary focus:ring-primary focus:ring-offset-0" />
                                <span className="ml-2 text-text-secondary">Remember me</span>
                            </label>
                            <Link href="/forgot-password" className="text-primary hover:text-primary-light font-medium transition-colors">
                                Forgot password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            isLoading={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-text-secondary">
                            Retailer?{' '}
                            <Link href="/retailers/register" className="text-primary hover:text-primary-light font-semibold transition-colors">
                                Register your business
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="mt-6 text-center text-sm text-text-muted">
                    <p className="mb-2">Protected by enterprise-grade security</p>
                    <div className="flex items-center justify-center gap-4">
                        <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-success" />
                            MFA Enabled
                        </span>
                        <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-success" />
                            Encrypted
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
