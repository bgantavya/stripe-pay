import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE importing routes that use them
dotenv.config();

import invoiceRoutes from './routes/invoice';
import paymentRoutes from './routes/payment';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - only needed for local dev
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('combined'));

// Webhook route needs raw body for signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Other routes use JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend static files
const buildPath = path.join(__dirname, './frontend/build');
app.use(express.static(buildPath));

// Handle React Router - serve index.html for all non-API routes
app.use((req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
