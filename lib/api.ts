import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 Unauthorized - maybe redirect to login or clear storage
        if (error.response && error.response.status === 401) {
            if (typeof window !== 'undefined') {
                // Optional: Clear token on 401
                // localStorage.removeItem('accessToken');
                // localStorage.removeItem('auth_token');
            }
        }
        return Promise.reject(error);
    }
);

export default api;

// Vehicles API
export const vehiclesApi = {
    getAll: async (params: any) => {
        try {
            const response = await api.get('/vehicles', { params });
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.error || { message: error.message }
            };
        }
    },
    getById: async (id: string) => {
        try {
            const response = await api.get(`/vehicles/${id}`);
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.error || { message: error.message }
            };
        }
    },
};

// Auth API
export const authApi = {
    login: async (data: any) => {
        try {
            const response = await api.post('/auth/login', data);
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.error || { message: error.message }
            };
        }
    },
    register: async (data: any) => {
        try {
            const response = await api.post('/auth/register', data);
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.error || { message: error.message }
            };
        }
    },
    logout: async () => {
        try {
            // Some backends might have a logout endpoint
            // await api.post('/auth/logout');
            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.error || { message: error.message }
            };
        }
    }
};
