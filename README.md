# Invoice Payment POC

A proof-of-concept application demonstrating Stripe payment gateway integration into an ERP invoice system.

## Tech Stack
- **Frontend**: React with TypeScript, TailwindCSS
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL
- **Payment**: Stripe

## Quick Start

### 1. Database Setup
```bash
# Create PostgreSQL database
psql -c "CREATE DATABASE invoice_poc;"

# Run schema
psql -d invoice_poc -f database/init.sql
```

### 2. Configure Environment

**Backend** (`backend/.env`):
```
DATABASE_URL=postgresql://username:password@localhost:5432/invoice_poc
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
FRONTEND_URL=http://localhost:3000
PORT=3001
```

**Frontend** (`frontend/.env`):
```
REACT_APP_API_URL=http://localhost:3001/api
```

### 3. Stripe Webhook Setup

Use Stripe CLI for local development:

```bash
# Login to Stripe CLI
stripe login

# Start forwarding webhooks to your local server
stripe listen --forward-to localhost:3001/api/payments/webhook

# Copy the webhook signing secret and add to backend .env:
# STRIPE_WEBHOOK_SECRET=whsec_...
```

This automatically handles:
- `checkout.session.completed` - marks invoice as paid
- `payment_link.created` - logs payment link creation

### 4. Start Application
```bash
# Terminal 1 - Backend (port 3001)
cd backend && npm run dev

# Terminal 2 - Frontend (port 3000)
cd frontend && npm start
```

### 5. Test Payment Flow
1. Open http://localhost:3000
2. Create invoice with client details and items
3. Save draft, then click "Publish Invoice"
4. Copy the generated payment link
5. Pay using Stripe test card: `4242 4242 4242 4242`
6. Invoice status updates to "Paid" via webhook

## Features
- Create draft invoices with line items
- Publish to generate Stripe payment links
- One-time use payment links
- Real-time status updates via webhooks
- Dashboard with all invoices and statuses

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/invoices` | List all invoices |
| POST | `/api/invoices` | Create new invoice |
| GET | `/api/invoices/:id` | Get invoice details |
| PUT | `/api/invoices/:id/publish` | Publish invoice |
| POST | `/api/payments/create-link` | Generate Stripe payment link |
| POST | `/api/payments/webhook` | Stripe webhook handler |

## Project Structure
```
splitwise/
├── frontend/              # React application
│   ├── src/components/    # Dashboard, InvoiceForm, InvoiceDetail
│   ├── src/services/api.ts
│   └── src/types/invoice.ts
├── backend/               # Express.js API
│   ├── src/routes/        # invoice.ts, payment.ts
│   ├── src/services/      # invoiceService.ts
│   └── src/models/        # database.ts, Invoice.ts
└── database/init.sql      # PostgreSQL schema
```

## Payment Status Flow
- **Draft**: Invoice created, not yet published
- **Published**: Payment link generated, ready for payment
- **Paid**: Payment received via Stripe, link expired

## Deployment

### Option 1: AWS (Full Control)
Deploy on AWS EC2 with RDS PostgreSQL:

**1. Create RDS PostgreSQL Database**
- Go to RDS Console → Create Database
- Choose PostgreSQL, Free tier eligible
- Set DB name, username, password
- Note the endpoint (e.g., `invoice-db.xyz.us-east-1.rds.amazonaws.com`)

**2. Launch EC2 Instance**
- Ubuntu 22.04 LTS, t2.micro (free tier)
- Security Group: Allow HTTP (80), HTTPS (443), SSH (22)
- SSH into the instance

**3. Setup EC2 Server**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL client
sudo apt install -y postgresql-client

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Clone your repository
git clone <your-repo-url>
cd splitwise/backend

# Install dependencies and build
npm install

# Setup environment
cp .env.example .env
# Edit .env with your RDS endpoint and Stripe keys
nano .env

# Run database migrations
psql $DATABASE_URL -f ../database/init.sql

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**4. Configure Nginx**
```bash
# Copy nginx config
sudo cp ../nginx.conf /etc/nginx/sites-available/invoice-app
sudo ln -s /etc/nginx/sites-available/invoice-app /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

**5. Deploy Frontend**
```bash
# On your local machine
cd frontend
npm install
npm run build

# Upload build folder to EC2
scp -r build/ ubuntu@<ec2-ip>:/var/www/invoice-app/

# On EC2, set permissions
sudo chown -R www-data:www-data /var/www/invoice-app
```

**6. Setup Webhook**
- In Stripe Dashboard, add webhook endpoint: `http://<ec2-ip>/api/payments/webhook`
- Enable events: `checkout.session.completed`, `payment_link.created`
- Copy webhook secret to `.env`
- Restart: `pm2 restart invoice-api`

**7. (Optional) Add HTTPS with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 2: Railway (Easiest)
Railway provides free PostgreSQL hosting and easy deployment:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd backend && railway init

# Add PostgreSQL database
railway add --database

# Deploy backend
railway up

# Get your Railway URL and set FRONTEND_URL in variables
```

### Option 2: Render
1. Create a Web Service for the backend
2. Add PostgreSQL database
3. Set environment variables
4. Deploy frontend to Render Static Sites or Vercel

### Required Environment Variables
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | Stripe secret key (test or live) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `FRONTEND_URL` | Your frontend URL (for CORS) |
| `PORT` | Server port (Railway/Render set this automatically) |

### Production Build
```bash
# Backend
cd backend
npm install
npm run build
npm start

# Frontend
cd frontend
npm install
npm run build
# Serve build/ folder with any static server
```
