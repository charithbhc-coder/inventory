# Enterprise Inventory Management System (EIMS)

A comprehensive, multi-tenant inventory management system built with NestJS and PostgreSQL.

## 🚀 Key Features

- **Multi-tenancy**: Complete data isolation between companies.
- **Role-Based Access Control (RBAC)**: Super Admin, Company Admin, Department Admin, Warehouse Admin, and Staff roles.
- **Item Lifecycle**: Tracking items from warehouse receiving to distribution, assignment, and retirement.
- **AliExpress-style Timeline**: Full audit trail for every item event.
- **Asset Management**: Depreciation (Straight-line/Double-Declining), Maintenance scheduling, and Repair tracking.
- **Reports & Analytics**: PDF/Excel exports and real-time dashboard analytics.
- **Notifications**: Real-time WebSocket updates and email alerts.
- **Audit Logging**: Comprehensive recording of all write operations.

## 🛠️ Tech Stack

- **Backend**: NestJS (Node.js)
- **Database**: PostgreSQL with TypeORM
- **Auth**: JWT with Refresh Tokens & BCrypt (Cost Factor 12)
- **Real-time**: Socket.io (WebSockets)
- **Communication**: Nodemailer (SMTP)
- **Security**: Helmet, Throttler (Rate Limiting)

## 🏁 Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and provide your database credentials and secret keys.

4. Initialize the database:
   The application uses TypeORM synchronization in development mode to automatically create tables.
   
5. Seed the Super Admin:
   ```bash
   npm run seed
   ```
   This creates the initial system administrator account using the credentials defined in your `.env` file.

### Running the App

```bash
# development
$ npm run start

# watch mode (highly recommended for development)
$ npm run start:dev

# production mode
$ npm run start:prod
```

## 🧪 Testing

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e
```

## 🛡️ Security Best Practices

- **synchronize: false**: In production, TypeORM synchronization is disabled. Use migrations for schema changes.
- **Rate Limiting**: Throttler is configured to prevent brute-force attacks.
- **Audit Logs**: The `AuditLogInterceptor` captures every write operation with `entity_id` tracking.

## 📄 License

MIT
