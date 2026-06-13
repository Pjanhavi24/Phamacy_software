import 'dotenv/config';
import path from 'path';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { connectRedis, getRedisClient } from './utils/redis';

// Route imports (only routes that exist)
import authRoutes from './routes/auth';
import medicineRoutes from './routes/medicines';
import medicineCatalogRoutes from './routes/medicine-catalog';
import supplierRoutes from './routes/suppliers';
import purchaseRoutes from './routes/purchases';
import saleRoutes from './routes/sales';
import inventoryRoutes from './routes/inventory';
import customerRoutes from './routes/customers';
import prescriptionRoutes from './routes/prescriptions';
import reportRoutes from './routes/reports';
import masterRoutes from './routes/masters';
import dashboardRoutes from './routes/dashboard';
import doctorRoutes from './routes/doctors';
import barcodeRoutes from './routes/barcode';
import storeRoutes from './routes/stores';
import whatsappRoutes from './routes/whatsapp';
import aiRoutes from './routes/ai';
import gmailRoutes from './routes/gmail';
import workspaceRoutes from './routes/workspace';

const app: Application = express();
const PORT = Number(process.env.PORT) || Number(process.env.BACKEND_PORT) || '0.0.0.0';

app.use(helmet());

app.use(cors({
  origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = `req_${Date.now()}`;
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  const redis = getRedisClient();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: { redis: redis ? 'connected' : 'unavailable', database: 'connected' },
    version: '1.0.0',
  });
});

// Serve uploaded files (prescriptions, etc.). Reached from the frontend via the
// Next.js /api proxy, e.g. /api/uploads/prescriptions/<file>.
app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/medicines', medicineRoutes);
app.use('/api/v1/medicine-catalog', medicineCatalogRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/prescriptions', prescriptionRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/masters', masterRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/barcode', barcodeRoutes);
app.use('/api/v1/stores', storeRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/gmail', gmailRoutes);
app.use('/api/v1/workspace', workspaceRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use(errorHandler);

process.on('SIGTERM', async () => { process.exit(0); });
process.on('SIGINT', async () => { process.exit(0); });

const startServer = async () => {
  try {
    await connectRedis();
    app.listen(PORT, () => {
      console.log(`\n🚀 Pharmacy ERP API running on http://localhost:${PORT}`);
      console.log(`📊 Health: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
export default app;
