# Accurify Platform

Complete tax compliance platform for Nigerian SMEs, built as a monorepo containing multiple applications.

## 📁 Repository Structure

```
accurify/
├── accurify-api/          # Spring Boot backend API
├── accurify-web/          # React web application (main dashboard)
├── accurify-storefront/   # QuickStore customer-facing storefronts
├── accurify-marketing/    # Marketing website
└── docker-compose.yml     # Orchestrates all services
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Java 17+ (for local API development)
- Node.js 18+ (for local frontend development)

### Run All Services

```bash
# Start the entire platform
docker-compose up -d

# Start with database tools (pgAdmin & Redis Commander)
docker-compose --profile tools up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Service URLs

- **API**: http://localhost:8080
- **Web App**: http://localhost:3004
- **Marketing**: http://localhost:3000
- **Storefront**: http://localhost:5173
- **API Docs**: http://localhost:8080/swagger-ui.html
- **pgAdmin** (tools profile): http://localhost:5050
- **Redis Commander** (tools profile): http://localhost:8081

## 🏗️ Individual Service Development

### Backend API (Spring Boot)

```bash
cd accurify-api
./mvnw spring-boot:run
```

### Web Application (React + Vite)

```bash
cd accurify-web
npm install
npm run dev
```

### Storefront (React + Vite)

```bash
cd accurify-storefront
npm install
npm run dev
```

### Marketing Site (React + Vite)

```bash
cd accurify-marketing
npm install
npm run dev
```

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-256-bits

# Database (auto-configured by docker-compose)
POSTGRES_DB=accurify
POSTGRES_USER=accurify
POSTGRES_PASSWORD=accurify

# Sentry Error Tracking
SENTRY_DSN=your-sentry-dsn
VITE_SENTRY_DSN=your-frontend-sentry-dsn
VITE_STOREFRONT_SENTRY_DSN=your-storefront-sentry-dsn

# External Services
MONO_SECRET_KEY=your-mono-key
PAYSTACK_SECRET_KEY=your-paystack-secret
PAYSTACK_PUBLIC_KEY=your-paystack-public

# Email
MAIL_FROM=noreply@accurify.co
MAIL_FROM_NAME=Accurify

# URLs
FRONTEND_URL=http://localhost:3004
VITE_API_BASE_URL=http://localhost:8080
```

## 📦 Database Management

### Access PostgreSQL

```bash
# Via psql
docker exec -it accurify-postgres psql -U accurify -d accurify

# Via pgAdmin (with tools profile)
# Open http://localhost:5050
# Email: admin@accurify.co
# Password: admin
```

### Run Migrations

Migrations run automatically via Flyway on API startup.

## 🧪 Testing

```bash
# API tests
cd accurify-api
./mvnw test

# Frontend tests
cd accurify-web
npm test
```

## 🏢 Architecture

### Backend (accurify-api)
- **Framework**: Spring Boot 3.2
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Features**:
  - JWT Authentication
  - Double-entry bookkeeping (GL)
  - Bank sync via Mono.co
  - Invoice generation
  - QuickStore inventory & orders
  - Sentry error tracking

### Frontend (accurify-web)
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **UI**: Carbon Design System (IBM)
- **State**: React Query + Zustand
- **Features**:
  - Business dashboard
  - Invoice management
  - Transaction categorization
  - Financial reports
  - GL & Journal entries
  - QuickStore management

### Storefront (accurify-storefront)
- **Framework**: React 18 + TypeScript
- **Purpose**: Customer-facing store pages
- **Features**:
  - Product browsing
  - Shopping cart
  - Order placement
  - Payment integration

### Marketing (accurify-marketing)
- **Framework**: React 18 + TypeScript
- **Purpose**: Public marketing website
- **Routes**: /, /features, /pricing, /about

## 🚢 Deployment

Each application has its own Dockerfile and can be deployed independently:

- **API**: Railway / Heroku / AWS ECS
- **Web/Marketing/Storefront**: Vercel / Netlify / Railway

See individual project READMEs for deployment details.

## 📝 Development Workflow

1. **Feature branches**: Create from `development`
2. **Commit conventions**: Use conventional commits
3. **Pull requests**: Merge to `development` → `main`
4. **Testing**: All tests must pass before merge

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

Proprietary - Fortbridge Technologies Ltd

## 🔗 Links

- **Production**: https://app.accurify.co
- **Marketing**: https://accurify.co
- **API**: https://api.accurify.co
- **Storefront**: https://store.accurify.co

---

**Built by Fortbridge Technologies** 🚀
