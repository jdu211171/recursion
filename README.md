# Multi-tenant Borrowing/Lending System - Microservices Architecture

A scalable borrowing and lending platform built with microservices architecture, supporting multi-tenant operations with hierarchical organization and instance management.

## 🚀 Features

- **Multi-Tenant Architecture**: Hierarchical structure with Organizations and Instances
- **Role-Based Access Control**: Admin, Staff, and Borrower roles
- **Item Management**: Support for any type of borrowable items with categorization *and simplified quantity tracking*
- **Lending Workflows**: Checkout, return, reservations, and automatic penalties *with aggregate counts*
- **File Storage**: Secure document attachments with MinIO
- **API Gateway**: Nginx-based routing with rate limiting and CORS

## 🏗️ Architecture 

```
┌─────────────┐     ┌─────────────────┐
│   Browser   │────▶│  Nginx Gateway  │
└─────────────┘     └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐      ┌────────▼────────┐   ┌───────▼──────┐
   │Frontend │      │  Auth Service   │   │Business Logic│
   │ (React) │      │  (Bun/Express)  │   │(Bun/Express) │
   └─────────┘      └────────┬────────┘   └───────┬──────┘
                             │                    │
                    ┌────────▼────────────────────▼────────┐
                    │        PostgreSQL Database           │
                    └──────────────────────────────────────┘
                                     │
                             ┌───────▼────────┐
                             │  File Storage  │
                             │ (Bun/Express)  │
                             └───────┬────────┘
                                     │
                             ┌───────▼────────┐
                             │     MinIO      │
                             └────────────────┘
```


## 🛠️ Tech Stack

- **Backend**: Bun + Express + TypeScript
- **Frontend**: React + TypeScript + Material-UI + Vite
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: MinIO (S3-compatible)
- **API Gateway**: Nginx
- **Containerization**: Docker & Docker Compose
- **Authentication**: JWT with refresh tokens

## 📦 Services

- **Frontend Service** (Port 5173): React-based web application
- **Auth Service** (Port 3000): Authentication and authorization with RBAC
- **Business Logic Service** (Port 3001): Core lending/borrowing operations
- **File Storage Service** (Port 3002): Document and file management
- **PostgreSQL** (Port 5432): Relational database
- **MinIO** (Port 9000/9001): Object storage
- **Nginx** (Port 80/443): API Gateway

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Bun (for local development)
- Node.js 18+ (for frontend)

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd recursion

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configurations
```

3. Generate SSL certificates (for HTTPS):
```bash
cd infrastructure
./generate-ssl-cert.sh
```

4. Start all services:
```bash
docker-compose up -d
```

5. Access the application:
- Frontend: http://localhost
- API: http://localhost/api
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

## 📚 Documentation

- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - Detailed implementation overview
- [Testing Guide](infrastructure/TESTING_GUIDE.md) - Integration testing instructions
- [Requirements](SRS.md) - Software Requirements Specification
- [Development Tasks](TODO.md) - Task tracking and progress

## 🧪 Testing

See [TESTING_GUIDE.md](infrastructure/TESTING_GUIDE.md) for detailed testing instructions.

Quick test:
```bash
# Register a user
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "orgId": 1}'
```

## 🔧 Development

For local development with hot reload:
```bash
# Start services in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Or run services locally
cd services/[service-name]
bun install
bun dev
```
 
## 📝 License

This project is licensed under the MIT License.
