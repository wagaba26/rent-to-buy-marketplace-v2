'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

interface User {
    id: string;
    email: string;
    role: 'customer' | 'retailer' | 'admin';
    name?: string;
    retailerId?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string, accessCode?: string, mfaToken?: string) => Promise<{ success: boolean; error?: string; requiresMFA?: boolean; requiresAccessCode?: boolean }>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check for existing session
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('accessToken');

        if (storedUser && token) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                localStorage.removeItem('user');
                localStorage.removeItem('accessToken');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string, accessCode?: string, mfaToken?: string) => {
        try {
            const response = await authApi.login({ email, password, accessCode, mfaToken });

            if (response.success && response.data) {
                // Store tokens and user data
                localStorage.setItem('accessToken', response.data.accessToken);
                localStorage.setItem('refreshToken', response.data.refreshToken);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                setUser(response.data.user);

                // Redirect based on role
                const role = response.data.user.role;
                if (role === 'admin') {
                    router.push('/admin/retailers');
                } else if (role === 'retailer') {
                    router.push('/retailer/dashboard');
                } else {
                    router.push('/dashboard');
                }

                return { success: true };
            } else {
                // Check for MFA or access code requirements
                if (response.error?.code === 'MFA_REQUIRED') {
                    return { success: false, requiresMFA: true };
                } else if (response.error?.code === 'ACCESS_CODE_REQUIRED') {
                    return { success: false, requiresAccessCode: true };
                }

                return { success: false, error: response.error?.message || 'Login failed' };
            }
        } catch (error) {
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
        router.push('/auth/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
