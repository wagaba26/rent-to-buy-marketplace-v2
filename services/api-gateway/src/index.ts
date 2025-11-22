import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticateToken } from './middleware/auth';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// Service URLs
const services = {
  user: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  vehicle: process.env.VEHICLE_SERVICE_URL || 'http://localhost:3002',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003',
  credit: process.env.CREDIT_SERVICE_URL || 'http://localhost:3004',
  telematics: process.env.TELEMATICS_SERVICE_URL || 'http://localhost:3005',
  support: process.env.SUPPORT_SERVICE_URL || 'http://localhost:3006',
};

// Proxy middleware configuration
const proxyOptions = {
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // Remove /api prefix
  },
  onError: (err: any, req: any, res: any) => {
    console.error('Proxy error:', err);
    res.status(503).json({
      success: false,
      error: {
        message: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE',
      },
    });
  },
  onProxyReq: (proxyReq: any, req: any) => {
    // Forward original IP
    if (req.headers['x-forwarded-for']) {
      proxyReq.setHeader('x-forwarded-for', req.headers['x-forwarded-for']);
    }
    // Forward user information from authenticated requests
    if (req.user) {
      proxyReq.setHeader('x-user-id', req.user.userId);
      proxyReq.setHeader('x-user-email', req.user.email);
      proxyReq.setHeader('x-user-role', req.user.role);
    }
  },
};

// Public routes (no authentication required)
app.use('/api/auth', createProxyMiddleware({
  ...proxyOptions,
  target: services.user,
}));

app.use('/api/password-reset', createProxyMiddleware({
  ...proxyOptions,
  target: services.user,
}));

// Protected routes (authentication required)
app.use('/api/users', authenticateToken, createProxyMiddleware({
  ...proxyOptions,
  target: services.user,
}));

app.use('/api/vehicles', createProxyMiddleware({
  ...proxyOptions,
  target: services.vehicle,
}));

app.use('/api/payments', authenticateToken, createProxyMiddleware({
  ...proxyOptions,
  target: services.payment,
}));

app.use('/api/credit', authenticateToken, createProxyMiddleware({
  ...proxyOptions,
  target: services.credit,
}));

app.use('/api/telematics', authenticateToken, createProxyMiddleware({
  ...proxyOptions,
  target: services.telematics,
}));

app.use('/api/support', authenticateToken, createProxyMiddleware({
  ...proxyOptions,
  target: services.support,
}));

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

