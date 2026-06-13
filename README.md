# Pharmacy Management ERP

## Overview

Pharmacy Management ERP is a full-stack, production-ready enterprise resource planning system built specifically for modern pharmacies. It provides end-to-end management of inventory, sales, billing, prescriptions, supplier relationships, GST compliance, and reporting â€” all in a single unified platform. Built with Node.js, React, PostgreSQL, and Redis, it supports multi-store operations, role-based access control, real-time alerts, and automated compliance reporting.

---

## Features

| # | Module | Description |
|---|--------|-------------|
| 1 | Dashboard | Real-time KPIs, sales charts, expiry alerts, low stock widgets |
| 2 | Inventory Management | Stock tracking, batch management, reorder levels |
| 3 | Medicine Catalog | Drug database with generic names, HSN codes, GST rates |
| 4 | Sales & Billing | POS billing, invoice generation, discount management |
| 5 | Purchase Management | Purchase orders, GRN, supplier invoices |
| 6 | Prescription Management | Prescription upload, validation, dispensing workflow |
| 7 | Supplier Management | Supplier profiles, GSTIN, payment terms, ledger |
| 8 | Customer Management | Patient profiles, purchase history, loyalty points |
| 9 | Doctor Management | Doctor directory, prescription tracking, referral reports |
| 10 | Expiry Management | Expiry tracking, near-expiry alerts, return to supplier |
| 11 | GST Compliance | GSTR-1, GSTR-3B generation, HSN summary, tax reports |
| 12 | Financial Reports | P&L, daily sales, monthly summaries, profit margins |
| 13 | User & Role Management | RBAC with granular permissions per module |
| 14 | Store Management | Multi-store support, store-level configuration |
| 15 | Barcode & Label Printing | Barcode generation, label printing, batch labels |
| 16 | Return & Refund | Sales returns, purchase returns, credit notes |
| 17 | Scheme & Offers | Buy-X-get-Y, percentage discounts, medicine schemes |
| 18 | Notifications & Alerts | Email/SMS alerts for expiry, low stock, pending orders |
| 19 | Audit Logs | Full audit trail of all system actions |
| 20 | Backup & Restore | Automated DB backups, one-click restore |
| 21 | Thermal Billing | 80mm thermal receipt printing support |
| 22 | Drug Interaction Checker | Basic drug interaction warnings at point of sale |
| 23 | Scheduled Reports | Automated weekly/monthly email reports |
| 24 | API Integration | RESTful API for third-party integrations and mobile apps |

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React + TypeScript | 18.x |
| UI Library | shadcn/ui + Tailwind CSS | latest |
| Backend | Node.js + Express | 18.x / 4.x |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 15+ |
| Cache | Redis | 7.x |
| Auth | JWT + bcryptjs | â€” |
| PDF Generation | PDFKit | 0.15.x |
| Job Scheduling | node-cron | 3.x |
| Email | Nodemailer | 6.x |
| Containerization | Docker + Docker Compose | â€” |
| Package Manager | npm workspaces | â€” |

---

## Prerequisites

- **Node.js** 18 or higher
- **PostgreSQL** 15 or higher (or use the Docker Compose setup)
- **Redis** 7 or higher (or use the Docker Compose setup)
- **Docker & Docker Compose** (recommended for local development)
- **npm** 9 or higher

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Pjanhavi24/Phamacy_software.git
cd Phamacy_software
```

### 2. Install Dependencies

From the project root (installs dependencies for all workspaces):

```bash
npm install
```

### 3. Configure Environment Variables

The backend reads the root `.env`; the frontend reads `frontend/.env.local`:

```bash
# Backend (database URL, JWT secret, mail, etc.)
cp .env.example .env

# Frontend (public API URL & app name — no secrets)
cp frontend/.env.example frontend/.env.local
```

Open `.env` and fill in all required values (at minimum `DATABASE_URL`). See the
[Environment Variables](#environment-variables) section below for each key. The
defaults in `frontend/.env.example` work out-of-the-box for local development.

> **Security:** `.env` / `.env.local` and any OAuth token files
> (`gmail_token.json`, `credentials.json`) are git-ignored and must never be
> committed. Use the `.env.example` templates as the source of truth instead.

### 4. Start PostgreSQL and Redis with Docker

```bash
docker-compose up -d
```

This starts a PostgreSQL 15 container on port `5432` and a Redis 7 container on port `6379`.

### 5. Run Database Migrations

```bash
cd backend && npm run db:migrate
```

This applies all Prisma migrations and creates the database schema.

### 6. Seed the Database

```bash
npm run db:seed
```

This populates the database with sample data including an admin user, medicines, categories, suppliers, doctors, and customers.

### 7. Start the Development Server

From the project root:

```bash
npm run dev
```

This starts both the backend API server and the frontend development server concurrently.

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

> **Windows note:** if pages get stuck loading or routes 404 intermittently,
> Windows Defender may be corrupting the on-disk Next.js build cache. Run
> `./setup-dev.ps1` once (adds a Defender exclusion) and restart the dev server.

---

## Environment Variables

Create a `.env` file at the project root based on `.env.example`. The table below explains every key:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | Full PostgreSQL connection string used by Prisma | `postgresql://postgres:password@localhost:5432/pharmacy_erp` |
| `REDIS_URL` | Yes | Redis connection URL | `redis://localhost:6379` |
| `JWT_SECRET` | Yes | Secret key used to sign JWT access tokens (min 32 chars) | `super-secret-jwt-key-change-in-prod` |
| `JWT_REFRESH_SECRET` | Yes | Secret key used to sign JWT refresh tokens | `super-secret-refresh-key-change-in-prod` |
| `JWT_EXPIRES_IN` | No | Access token expiry duration | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token expiry duration | `7d` |
| `PORT` | No | Port for the backend Express server | `3000` |
| `NODE_ENV` | No | Runtime environment (`development`, `production`, `test`) | `development` |
| `FRONTEND_URL` | Yes | Frontend origin URL for CORS configuration | `http://localhost:5173` |
| `SMTP_HOST` | Yes | SMTP server hostname for outgoing emails | `smtp.gmail.com` |
| `SMTP_PORT` | Yes | SMTP server port | `587` |
| `SMTP_SECURE` | No | Use TLS for SMTP (`true` for port 465) | `false` |
| `SMTP_USER` | Yes | SMTP authentication username / email address | `alerts@yourpharmacy.com` |
| `SMTP_PASS` | Yes | SMTP authentication password or app password | `your-app-password` |
| `SMTP_FROM` | Yes | Sender name and address shown on outgoing emails | `MedCare Pharmacy <alerts@yourpharmacy.com>` |
| `ADMIN_EMAIL` | Yes | Email address that receives admin alerts and reports | `admin@yourpharmacy.com` |
| `BCRYPT_ROUNDS` | No | Number of bcrypt salt rounds (higher = slower, more secure) | `12` |
| `UPLOAD_DIR` | No | Filesystem path for uploaded files (prescriptions, etc.) | `./uploads` |
| `MAX_FILE_SIZE_MB` | No | Maximum allowed file upload size in megabytes | `10` |
| `RATE_LIMIT_WINDOW_MS` | No | Time window in ms for API rate limiting | `900000` |
| `RATE_LIMIT_MAX` | No | Maximum requests per window per IP | `100` |
| `POSTGRES_USER` | No | PostgreSQL username (Docker Compose only) | `postgres` |
| `POSTGRES_PASSWORD` | No | PostgreSQL password (Docker Compose only) | `postgres` |
| `POSTGRES_DB` | No | PostgreSQL database name (Docker Compose only) | `pharmacy_erp` |

---

## Default Login Credentials

After running `npm run db:seed`, the following accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@pharmacy.com | Admin@123 |
| Pharmacist | pharmacist@pharmacy.com | Pharma@123 |

> **Security Notice:** Change these credentials immediately in any staging or production environment.

---

## Available Scripts

All scripts can be run from the project root unless noted otherwise.

| Script | Location | Description |
|--------|----------|-------------|
| `npm run dev` | Root | Start frontend and backend in development mode concurrently |
| `npm run build` | Root | Build both frontend and backend for production |
| `npm run lint` | Root | Run ESLint across all workspaces |
| `npm run test` | Root | Run all test suites |
| `npm run db:migrate` | `backend/` | Apply pending Prisma migrations |
| `npm run db:migrate:prod` | `backend/` | Apply migrations in production mode |
| `npm run db:seed` | `backend/` | Seed the database with initial data |
| `npm run db:reset` | `backend/` | Drop and recreate the database, then migrate and seed |
| `npm run db:studio` | `backend/` | Open Prisma Studio (visual DB editor) at port 5555 |
| `npm run db:generate` | `backend/` | Regenerate Prisma client after schema changes |
| `npm run start` | `backend/` | Start backend in production mode |
| `npm run dev` | `frontend/` | Start frontend Vite dev server |
| `npm run build` | `frontend/` | Build frontend for production |
| `npm run preview` | `frontend/` | Preview production frontend build |

---

## Module Overview

| Module | Route Prefix | Key Endpoints |
|--------|-------------|---------------|
| Auth | `/api/auth` | login, logout, refresh, change-password |
| Dashboard | `/api/dashboard` | stats, charts, alerts |
| Medicines | `/api/medicines` | CRUD, search, barcode lookup |
| Categories | `/api/categories` | CRUD, medicine count |
| Inventory | `/api/inventory` | stock levels, adjustments, audit |
| Sales | `/api/sales` | create bill, list, invoice PDF |
| Purchases | `/api/purchases` | PO creation, GRN, list |
| Suppliers | `/api/suppliers` | CRUD, ledger, outstanding |
| Customers | `/api/customers` | CRUD, purchase history |
| Doctors | `/api/doctors` | CRUD, prescriptions |
| Prescriptions | `/api/prescriptions` | upload, verify, dispense |
| Returns | `/api/returns` | sales return, purchase return |
| GST | `/api/gst` | GSTR-1, GSTR-3B, HSN summary |
| Reports | `/api/reports` | sales, purchase, profit, stock |
| Users | `/api/users` | CRUD, role assignment |
| Stores | `/api/stores` | multi-store config |
| Notifications | `/api/notifications` | list, mark read |
| Audit Logs | `/api/audit` | list with filters |
| Schemes | `/api/schemes` | CRUD, apply to sale |
| Expiry | `/api/expiry` | near-expiry list, batch actions |
| Backup | `/api/backup` | trigger backup, restore |
| Labels | `/api/labels` | generate barcode, print label |

---

## API Documentation

Interactive Swagger UI is available at:

```
http://localhost:3000/api-docs
```

The OpenAPI 3.0 specification file is located at `backend/src/swagger.yaml`. All endpoints are documented with request/response schemas, authentication requirements, and example payloads.

---

## Project Structure

```
pharmacy-erp/
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ prisma/
â”‚   â”‚   â”œâ”€â”€ schema.prisma       # Database schema
â”‚   â”‚   â”œâ”€â”€ migrations/         # Migration history
â”‚   â”‚   â””â”€â”€ seed.ts             # Database seed file
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ controllers/        # Route handlers
â”‚   â”‚   â”œâ”€â”€ services/           # Business logic
â”‚   â”‚   â”œâ”€â”€ jobs/               # Scheduled cron jobs
â”‚   â”‚   â”œâ”€â”€ middleware/         # Auth, validation, error handling
â”‚   â”‚   â”œâ”€â”€ routes/             # Express routers
â”‚   â”‚   â”œâ”€â”€ utils/              # Helpers and utilities
â”‚   â”‚   â””â”€â”€ app.ts              # Express app entry point
â”‚   â””â”€â”€ package.json
â”œâ”€â”€ frontend/
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ components/         # Reusable UI components
â”‚   â”‚   â”œâ”€â”€ pages/              # Page-level components
â”‚   â”‚   â”œâ”€â”€ hooks/              # Custom React hooks
â”‚   â”‚   â”œâ”€â”€ store/              # State management
â”‚   â”‚   â”œâ”€â”€ api/                # API client functions
â”‚   â”‚   â””â”€â”€ main.tsx            # App entry point
â”‚   â””â”€â”€ package.json
â”œâ”€â”€ docker-compose.yml
â”œâ”€â”€ .env.example
â”œâ”€â”€ package.json                # Root workspace config
â””â”€â”€ README.md
```

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024 Pharmacy Management ERP

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
