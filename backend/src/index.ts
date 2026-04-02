import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables BEFORE importing routes that use them
dotenv.config();

import invoiceRoutes from './routes/invoice';
import paymentRoutes from './routes/payment';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet());
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
