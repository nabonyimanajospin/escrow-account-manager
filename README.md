# Escrow Account Manager
### Property Transaction Edition

---

> A secure, full-stack web application that facilitates trustless real estate property transactions
> through a virtual escrow mechanism — ensuring neither the buyer nor the seller can act
> dishonestly during a property ownership transfer.

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [How It Works](#how-it-works)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Features](#features)
- [Transaction Lifecycle](#transaction-lifecycle)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Documentation](#documentation)
- [Author](#author)

---

## Overview

The **Escrow Account Manager** is a web-based platform built to solve one of the most critical
problems in real estate: **the lack of trust between a property buyer and a property seller**.

When a buyer wants to purchase a property, they cannot simply hand money to the seller before
the legal ownership transfer (called a **mutation**) is completed. Similarly, a seller cannot
transfer the property title without a guarantee of payment. This system acts as a **neutral
digital intermediary** — locking the buyer's funds in a secure virtual escrow account and only
releasing them when a verified mutation has been confirmed by a trusted administrator.

---

## Problem Statement

Traditional property transactions suffer from three major vulnerabilities:

1. **Buyer Risk** — The buyer pays the full amount but the seller refuses to complete the
   legal property ownership transfer (mutation), leaving the buyer with no property and no refund.

2. **Seller Risk** — The seller completes the ownership mutation but the buyer fails to transfer
   the agreed payment, leaving the seller with no compensation.

3. **Zero Transparency** — Neither party has real-time visibility into transaction progress,
   mutation status, or fund positions, creating confusion and potential for contract breaches.

**This system eliminates all three risks** by enforcing a strict, automated escrow workflow
where no single party can complete a financial transfer without system verification.

---

## How It Works

```
STEP 1 — Seller lists a property on the platform

STEP 2 — Buyer finds the property and initiates a transaction
          System automatically creates a locked Escrow Account (balance = 0)

STEP 3 — Buyer deposits the exact property price into the Escrow Account
          Money is now LOCKED — neither party can access it

STEP 4 — Seller initiates the legal mutation process
          Uploads mutation proof documents to the system

STEP 5 — Admin reviews all documents and verifies mutation outcome

          IF mutation SUCCEEDED:
              Admin releases funds → Seller receives payment
              Property status → SOLD

          IF mutation FAILED:
              Admin triggers refund → Buyer receives money back
              Property status → AVAILABLE again
```

---

## System Architecture

```
+--------------------------------------------------+
|            CLIENT (Browser)                      |
|       React.js SPA  —  Vite  —  Port 3000        |
+---------------------+----------------------------+
                      |
                      |  HTTPS / REST API (JSON)
                      |
+---------------------v----------------------------+
|         BACKEND — Node.js + Express.js           |
|                    Port 5000                     |
|                                                  |
|  +--------------------------------------------+  |
|  |  Routes:                                   |  |
|  |  /api/auth  /api/properties                |  |
|  |  /api/transactions                         |  |
|  +--------------------------------------------+  |
|  |  Middleware:                               |  |
|  |  JWT Authentication — Role Authorization  |  |
|  |  Global Error Handler                     |  |
|  +--------------------------------------------+  |
|  |  Controllers:                             |  |
|  |  AuthController — PropertyController      |  |
|  |  TransactionController                    |  |
|  +--------------------------------------------+  |
+---------------------+----------------------------+
                      |
                      |  Sequelize ORM
                      |
+---------------------v----------------------------+
|          PostgreSQL DATABASE                     |
|                                                  |
|  Tables:                                         |
|  Users | Properties | Transactions               |
|  EscrowAccounts | MutationDocuments              |
+--------------------------------------------------+
```

---

## Technology Stack

| Layer              | Technology        | Version    | Purpose                              |
|--------------------|-------------------|------------|--------------------------------------|
| Frontend           | React.js          | 18.x       | Component-based user interface       |
| Frontend Build     | Vite              | 4.x        | Dev server and production bundler    |
| Frontend Styling   | Tailwind CSS      | 3.x        | Utility-first responsive CSS         |
| Frontend Routing   | React Router DOM  | 6.x        | Client-side SPA navigation           |
| Frontend HTTP      | Axios             | Latest     | REST API communication               |
| Backend Runtime    | Node.js           | 18.x       | Server-side JavaScript runtime       |
| Backend Framework  | Express.js        | 4.x        | REST API routing and middleware      |
| Database           | PostgreSQL        | 15.x       | Relational database                  |
| ORM                | Sequelize         | 6.x        | Database modeling and queries        |
| Authentication     | JSON Web Token    | Latest     | Stateless user authentication        |
| Password Hashing   | bcryptjs          | Latest     | Secure password encryption           |
| Dev Tooling        | nodemon           | Latest     | Auto-restart backend on file changes |
| Config Management  | dotenv            | Latest     | Environment variable management      |

---

## Features

### Core Features (MVP)

| ID    | Feature                  | Description                                                               |
|-------|--------------------------|---------------------------------------------------------------------------|
| F-01  | User Authentication      | Secure registration and JWT login with roles: BUYER, SELLER, ADMIN        |
| F-02  | Property Listings        | Sellers create/manage listings; buyers browse and view property details    |
| F-03  | Escrow Account Creation  | Auto-generated virtual escrow account per transaction (balance starts at 0)|
| F-04  | Fund Deposit             | Buyer deposits exact property price; funds locked in escrow               |
| F-05  | Mutation Tracking        | Seller initiates mutation, uploads documents, tracks progress             |
| F-06  | Fund Release             | Admin releases escrowed funds to seller after verified mutation           |
| F-07  | Fund Refund              | Admin refunds buyer if mutation fails or is canceled                      |
| F-08  | Audit Trail              | All state changes timestamped and logged for compliance                   |

### Secondary Features

| ID    | Feature                  | Description                                                               |
|-------|--------------------------|---------------------------------------------------------------------------|
| F-09  | Role-Based Dashboard     | Each role (Buyer/Seller/Admin) sees a personalized contextual dashboard   |
| F-10  | In-App Notifications     | Real-time status indicators on every transaction state change             |

---

## Transaction Lifecycle

The escrow transaction follows a strict, ordered state machine:

```
[ PENDING ]
    |
    |  Buyer deposits exact property price
    v
[ FUNDS_DEPOSITED ]
    |
    |  Seller initiates mutation process
    v
[ MUTATION_INITIATED ]
    |
    |  Seller uploads proof documents
    v
[ MUTATION_IN_PROGRESS ]
    |
    |  Seller/Admin confirms mutation complete
    v
[ MUTATION_COMPLETED ]
    |
    +------  Admin approves  ------> [ FUNDS_RELEASED ]  -->  Property: SOLD
    |
    +------  Admin rejects   ------> [ REFUNDED ]        -->  Property: AVAILABLE
```

| State                  | Description                                                    |
|------------------------|----------------------------------------------------------------|
| PENDING                | Transaction created, escrow account exists with zero balance   |
| FUNDS_DEPOSITED        | Buyer has deposited the full property price into escrow        |
| MUTATION_INITIATED     | Seller has officially started the ownership transfer process   |
| MUTATION_IN_PROGRESS   | Seller has uploaded mutation proof; transfer is underway       |
| MUTATION_COMPLETED     | Ownership transfer is legally complete and confirmed           |
| FUNDS_RELEASED         | Admin released funds to seller; escrow balance is zero         |
| REFUNDED               | Admin refunded buyer; escrow balance is zero                   |

---

## API Endpoints

### Authentication

| Method | Endpoint              | Access  | Description                    |
|--------|-----------------------|---------|--------------------------------|
| POST   | /api/auth/register    | Public  | Register a new user account    |
| POST   | /api/auth/login       | Public  | Login and receive JWT token    |
| GET    | /api/auth/me          | Private | Get current user profile       |

### Properties

| Method | Endpoint                | Access              | Description                  |
|--------|-------------------------|---------------------|------------------------------|
| GET    | /api/properties         | Private — Any role  | Get all property listings    |
| POST   | /api/properties         | Private — SELLER    | Create a new listing         |
| GET    | /api/properties/:id     | Private — Any role  | Get single property details  |
| PUT    | /api/properties/:id     | Private — SELLER    | Update own listing           |
| DELETE | /api/properties/:id     | Private — SELLER    | Delete own listing           |

### Transactions and Escrow

| Method | Endpoint                                      | Access          | Description                          |
|--------|-----------------------------------------------|-----------------|--------------------------------------|
| POST   | /api/transactions/initiate                    | BUYER           | Start transaction, create escrow     |
| POST   | /api/transactions/:id/deposit                 | BUYER           | Deposit funds to escrow              |
| POST   | /api/transactions/:id/initiate-mutation       | SELLER          | Start mutation process               |
| POST   | /api/transactions/:id/upload-document         | SELLER          | Upload mutation document             |
| POST   | /api/transactions/:id/complete-mutation       | SELLER / ADMIN  | Confirm mutation complete            |
| POST   | /api/transactions/:id/release                 | ADMIN only      | Release funds to seller              |
| POST   | /api/transactions/:id/refund                  | ADMIN only      | Refund buyer                         |
| GET    | /api/transactions/my                          | BUYER / SELLER  | Get own transactions                 |
| GET    | /api/transactions                             | ADMIN only      | Get all transactions                 |
| GET    | /api/transactions/:id                         | Participant     | Get transaction details              |

---

## Project Structure

```
escrow-account-manager/
|
+-- backend/
|   +-- src/
|   |   +-- config/
|   |   |   +-- database.js          # PostgreSQL + Sequelize connection
|   |   +-- models/
|   |   |   +-- User.js              # User schema and password hashing
|   |   |   +-- Property.js          # Property listing schema
|   |   |   +-- Transaction.js       # Transaction state machine model
|   |   |   +-- EscrowAccount.js     # Escrow account and balance model
|   |   +-- controllers/
|   |   |   +-- authController.js    # Register, login, get profile
|   |   |   +-- propertyController.js # Property CRUD operations
|   |   |   +-- transactionController.js # Full escrow workflow logic
|   |   +-- middleware/
|   |   |   +-- auth.js              # JWT verification and role authorization
|   |   |   +-- errorHandler.js      # Global error handling middleware
|   |   +-- routes/
|   |       +-- authRoutes.js
|   |       +-- propertyRoutes.js
|   |       +-- transactionRoutes.js
|   +-- server.js                    # Express app entry point
|   +-- .env                         # Environment variables (not pushed to GitHub)
|   +-- package.json
|
+-- frontend/
|   +-- src/
|   |   +-- api/
|   |   |   +-- axiosConfig.js       # Axios instance with JWT interceptor
|   |   +-- components/
|   |   |   +-- auth/                # Login and Register forms
|   |   |   +-- common/             # Navbar, Footer, LoadingSpinner
|   |   |   +-- dashboard/          # Role-based dashboard
|   |   |   +-- properties/         # Property list, detail, form
|   |   |   +-- transactions/       # Transaction list, detail, deposit form
|   |   +-- context/
|   |   |   +-- AuthContext.jsx      # Global authentication state
|   |   +-- App.jsx                  # Routes and layout
|   |   +-- main.jsx                 # React entry point
|   +-- index.html
|   +-- vite.config.js
|   +-- package.json
|
+-- diagrams/                        # UML diagrams (Class, Use Case, Activity)
+-- PRD.md                           # Product Requirements Document
+-- SRS.md                           # Software Requirements Specification
+-- FRS.md                           # Functional Requirements Specification
+-- README.md                        # This file
+-- .gitignore
```

---

## Getting Started

### Prerequisites

Make sure the following are installed on your machine:

```bash
node --version      # Must be v18 or higher
npm --version       # Must be v9 or higher
psql --version      # PostgreSQL must be installed and running
git --version
```

### 1. Clone the Repository

```bash
git clone https://github.com/nabonyimanajospin/escrow-account-manager.git
cd escrow-account-manager
```

### 2. Set Up the Backend

```bash
cd escrow-account-manager/backend
npm install
```

Create your `.env` file (see Environment Variables section below), then run:

```bash
npm run dev
```

The backend server will start on **http://localhost:5000**

### 3. Set Up the Frontend

```bash
cd ../frontend
npm install
npm run dev
```

The frontend will start on **http://localhost:3000**

---

## Environment Variables

Create a `.env` file inside the `backend/` folder with the following variables:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=escrow_db
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
JWT_SECRET=your_very_strong_secret_key
JWT_EXPIRE=24h
NODE_ENV=development
```

Create a `.env` file inside the `frontend/` folder:

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Escrow Account Manager
```

> These files are listed in `.gitignore` and will never be pushed to GitHub.

---

## Documentation

All project documentation is available in the root of this repository:

| Document | File      | Description                                                  |
|----------|-----------|--------------------------------------------------------------|
| PRD      | PRD.md    | Product Requirements Document — vision, goals, stakeholders  |
| SRS      | SRS.md    | Software Requirements Specification — full technical spec    |
| FRS      | FRS.md    | Functional Requirements Specification — use cases, API spec  |

UML diagrams (Class Diagram, Use Case Diagram, Activity Diagram) are available in the
`diagrams/` folder.

---

## Author

| Field          | Details                                                     |
|----------------|-------------------------------------------------------------|
| Name           | Jospin Nabonyimana                                          |
| Role           | Intern Developer / System Architect                         |
| Institution    | Adventist University of Central Africa (AUCA)               |
| Faculty        | Faculty of Information Technology                           |
| Supervisor     | David Kubwimana — Senior Software Engineer                  |
| Organization   | URUTI HUB                                                   |
| GitHub         | https://github.com/nabonyimanajospin                        |
| Year           | 2026                                                        |

---

*This project was developed as part of a university internship program at URUTI HUB,
applying full SDLC methodology from requirements gathering through to implementation
and deployment.*
