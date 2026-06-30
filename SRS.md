# Software Requirements Specification (SRS)

---

| Field              | Details                                                        |
|--------------------|----------------------------------------------------------------|
| **Document Title** | Software Requirements Specification (SRS)                     |
| **Project Name**   | Escrow Account Manager — Property Transaction Edition          |
| **Document ID**    | EAM-SRS-001                                                    |
| **Version**        | 1.0.0                                                          |
| **Status**         | Draft                                                          |
| **Date Created**   | June 2026                                                      |
| **Last Updated**   | June 2026                                                      |
| **Author**         | Jospin Nabonyimana — Intern Developer / System Architect        |
| **Institution**    | Adventist University of Central Africa (AUCA), Faculty of Information Technology |
| **Supervisor**     | David Kubwimana — Senior Software Engineer                     |
| **Organization**   | URUTI HUB — Internship Host                                    |
| **Reference Standard** | IEEE Std 830-1998 (Software Requirements Specifications)  |

---

## Revision History

| Version | Date          | Author              | Description of Changes                        |
|---------|---------------|---------------------|-----------------------------------------------|
| 0.1     | June 2026     | Jospin Nabonyimana  | Initial draft created                         |
| 1.0     | June 2026     | Jospin Nabonyimana  | Complete version submitted for supervisor review |

---

## Table of Contents

1. Introduction
2. Overall Description
3. System Features & Functional Requirements
4. External Interface Requirements
5. Non-Functional Requirements
6. System Constraints
7. Technical Stack
8. Appendix — Data Models
9. Glossary

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) document formally defines the complete functional requirements, non-functional requirements, interface specifications, system constraints, and technical architecture for the **Escrow Account Manager** application. It serves as the definitive technical reference for the developer during implementation and as the primary evaluation document for the internship supervisor and university faculty.

### 1.2 Scope
The Escrow Account Manager is a full-stack web application that facilitates secure, trustless real estate property transactions through a virtual escrow mechanism. The system manages the complete lifecycle of a property transaction — from initial listing through fund deposit, legal mutation tracking, and final fund release or refund — ensuring that neither the buyer nor the seller can complete a unilateral financial action without system verification.

The application is built using the **MERN stack** (MongoDB, Express.js, React.js, Node.js) with Vite as the frontend build tool and Tailwind CSS for styling.

### 1.3 Document Conventions
- **P0** — Mandatory requirement. The system cannot be considered complete without this.
- **P1** — Secondary requirement. Required for full functionality but not the core MVP.
- **P2** — Nice-to-have. Implemented if time permits.
- **FR** prefix — Functional Requirement.
- **NFR** prefix — Non-Functional Requirement.
- **UC** prefix — Use Case.

### 1.4 Intended Audience

| Audience                  | Purpose                                                   |
|---------------------------|-----------------------------------------------------------|
| Developer (Intern)        | Primary implementation reference                          |
| Internship Supervisor     | Technical review, evaluation, and grading                 |
| University Faculty        | SDLC compliance and academic assessment                   |
| Future Maintainers        | Onboarding and extension reference                        |

### 1.5 References
- PRD Document: `EAM-PRD-001`
- FRS Document: `EAM-FRS-001`
- IEEE Std 830-1998: IEEE Recommended Practice for Software Requirements Specifications
- MERN Stack Documentation: https://www.mongodb.com, https://expressjs.com, https://react.dev, https://nodejs.org

---

## 2. Overall Description

### 2.1 Product Perspective
The Escrow Account Manager is a standalone, independent web application. It is not a module of a larger existing system. The backend operates as a stateless RESTful JSON API, and the frontend operates as a browser-based Single Page Application (SPA). The two components communicate exclusively through HTTP/HTTPS.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                             │
│           React.js SPA — Vite Dev Server (Port 3000)           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST API (JSON)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               BACKEND — Node.js + Express.js (Port 5000)        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Routes: /api/auth  /api/properties  /api/transactions  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  Middleware: JWT Auth ─ Role Authorization ─ Error      │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  Controllers: AuthCtrl ─ PropertyCtrl ─ TxnCtrl         │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Mongoose ODM
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  MongoDB Database                               │
│   Collections: Users │ Properties │ Transactions │ Escrow      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Product Functions
The system provides the following high-level capabilities:
1. Secure user registration, authentication, and role-based authorization.
2. Property listing management (Create, Read, Update, Delete) with status tracking.
3. Transaction lifecycle management governed by a strict state machine.
4. Virtual escrow account management including balance tracking, deposit history, and release history.
5. Administrative controls for mutation verification, fund release, and buyer refunds.
6. Full audit trail of all actions, timestamps, and reference numbers.

### 2.3 User Classes and Characteristics

| User Class | Technical Level | Frequency of Use | Permissions                              |
|------------|-----------------|------------------|------------------------------------------|
| BUYER      | Low–Medium       | Occasional       | Browse properties, initiate & fund transactions, monitor status |
| SELLER     | Low–Medium       | Occasional       | Create/manage listings, initiate mutation, upload documents      |
| ADMIN      | Medium–High      | Regular          | Full system oversight; fund release and refund authority         |

### 2.4 Operating Environment
- **Client:** Any modern web browser (Chrome, Firefox, Safari, Edge) on desktop or mobile.
- **Backend Server:** Node.js v18+ running on a Linux/Windows/macOS server or cloud platform (e.g., Render.com).
- **Database:** MongoDB v6+ running locally or on MongoDB Atlas (cloud).
- **Network:** Standard HTTP/HTTPS over TCP/IP.

### 2.5 Design and Implementation Constraints
- The technology stack is fixed: MongoDB, Express.js, React.js, Node.js (MERN).
- The frontend must be initialized using **Vite** (not Create React App).
- Budget is $0 — only free-tier tools and platforms are permitted.
- Timeline is 4–6 weeks from requirements to final presentation.
- Fund transfers are virtual/simulated; no real payment gateway integration is required.

### 2.6 Assumptions and Dependencies
- A MongoDB instance (local or Atlas) is available and accessible to the backend.
- Node.js v18 or higher and npm v9 or higher are installed on the development machine.
- The ADMIN account is pre-seeded in the database; it is not self-registrable.
- All mutation documents are represented as text strings (URLs or descriptions), not binary file uploads.

---

## 3. System Features & Functional Requirements

### 3.1 FR1: User Management & Authentication

| Req ID  | Priority | Requirement Description                                                                                          |
|---------|----------|------------------------------------------------------------------------------------------------------------------|
| FR1.1   | P0       | The system shall allow new users to register by providing: full name, email address, password, role, phone number, and address. |
| FR1.2   | P0       | All passwords must be hashed using bcrypt with a minimum of 10 salt rounds before being persisted to the database. |
| FR1.3   | P0       | The system shall reject registration if the provided email address already exists in the database.               |
| FR1.4   | P0       | On successful login with valid credentials, the system shall return a signed JWT token valid for 24 hours.       |
| FR1.5   | P0       | All protected API routes must validate the JWT Bearer token from the request Authorization header.               |
| FR1.6   | P0       | The system shall enforce role-based access control (RBAC) so that each endpoint is accessible only to authorized roles. |
| FR1.7   | P1       | Authenticated users shall be able to retrieve their own profile information via a protected `/api/auth/me` endpoint. |

### 3.2 FR2: Property Management

| Req ID  | Priority | Requirement Description                                                                                          |
|---------|----------|------------------------------------------------------------------------------------------------------------------|
| FR2.1   | P0       | Users with the `SELLER` or `ADMIN` role shall be able to create a new property listing.                         |
| FR2.2   | P0       | A property listing must include the following fields: title, description, price, location, bedrooms, bathrooms, area, property type, and image URLs. |
| FR2.3   | P0       | Property status must be initialized to `AVAILABLE` upon creation.                                               |
| FR2.4   | P0       | Any authenticated user (BUYER, SELLER, ADMIN) shall be able to view the full list of property listings.         |
| FR2.5   | P0       | Any authenticated user shall be able to view the detailed record of a single property by its ID.                |
| FR2.6   | P0       | Only the owning seller or an ADMIN shall be permitted to update or delete a property listing.                    |
| FR2.7   | P0       | Property status shall automatically transition from `AVAILABLE` to `PENDING` when a buyer initiates a transaction. |
| FR2.8   | P0       | Property status shall transition to `SOLD` upon successful fund release, and back to `AVAILABLE` upon a refund. |

### 3.3 FR3: Escrow & Transaction Operations

| Req ID  | Priority | Requirement Description                                                                                          |
|---------|----------|------------------------------------------------------------------------------------------------------------------|
| FR3.1   | P0       | A user with the `BUYER` role shall be able to initiate a transaction for any property with status `AVAILABLE`.   |
| FR3.2   | P0       | The system shall reject a transaction initiation if the buyer is the same user as the property's seller.         |
| FR3.3   | P0       | Upon transaction initiation, the system shall: (a) create a Transaction record with a unique ID (`TXN-XXXX`), (b) create a linked EscrowAccount with a unique account number (`ESC-XXXX`) and balance of `0`, and (c) set the property status to `PENDING`. |
| FR3.4   | P0       | Only the buyer of a transaction shall be permitted to deposit funds into the linked escrow account.              |
| FR3.5   | P0       | The deposited amount must exactly match the property listing price. Mismatched amounts shall be rejected with a validation error. |
| FR3.6   | P0       | Upon successful deposit, the escrow account balance shall be updated and the transaction status shall change to `FUNDS_DEPOSITED`. |
| FR3.7   | P0       | Only the seller of a transaction shall be permitted to initiate the mutation process (state → `MUTATION_INITIATED`). |
| FR3.8   | P0       | The seller shall be able to upload mutation document references (state → `MUTATION_IN_PROGRESS`).               |
| FR3.9   | P0       | The transaction state must change to `MUTATION_COMPLETED` when the seller or admin confirms ownership transfer is finalized. |
| FR3.10  | P0       | Only a user with the `ADMIN` role shall be permitted to release escrowed funds to the seller. Upon release: (a) escrow balance is set to `0`, (b) escrow account status → `RELEASED`, (c) transaction status → `FUNDS_RELEASED`, (d) property status → `SOLD`. |
| FR3.11  | P0       | Only a user with the `ADMIN` role shall be permitted to trigger a buyer refund. Upon refund: (a) escrow balance is set to `0`, (b) escrow account status → `REFUNDED`, (c) transaction status → `REFUNDED`, (d) property status → `AVAILABLE`. |
| FR3.12  | P1       | All deposit events shall be stored in the escrow account's deposit history with: amount, timestamp, and reference number. |
| FR3.13  | P1       | All release events shall be stored in the escrow account's release history with: amount, timestamp, and reference number. |

### 3.4 FR4: Audit Trail

| Req ID  | Priority | Requirement Description                                                                                          |
|---------|----------|------------------------------------------------------------------------------------------------------------------|
| FR4.1   | P1       | All transaction state change timestamps (deposit date, mutation start, mutation end, release date, refund date) must be recorded. |
| FR4.2   | P1       | All model records must include a `createdAt` timestamp and an `updatedAt` timestamp, automatically managed by the system. |
| FR4.3   | P1       | All transaction records must be retrievable by authenticated users relevant to that transaction (buyer, seller, or admin). |

---

## 4. External Interface Requirements

### 4.1 User Interfaces
- The system shall provide a browser-based SPA built with React.js and styled using Tailwind CSS.
- The interface must be fully responsive, supporting screen widths from 375px (mobile) to 1920px (desktop).
- Each user role (BUYER, SELLER, ADMIN) must see a personalized dashboard showing only relevant actions and data.
- All state transitions must be clearly communicated to the user through status badges and in-app toast notifications.
- Loading states must be handled gracefully with loading spinner components.

### 4.2 Hardware Interfaces
- No specific hardware interface is required. The system operates on any standard computing device capable of running a modern web browser.

### 4.3 Software Interfaces

| Interface              | Technology      | Purpose                                              |
|------------------------|-----------------|------------------------------------------------------|
| Database Interface     | Mongoose ODM    | Connects Node.js backend to MongoDB collections      |
| HTTP Client Interface  | Axios           | Frontend communicates with backend REST API          |
| Authentication Interface | JSON Web Token | Secures API routes; tokens stored in localStorage   |
| Build Interface        | Vite            | Frontend development server and production bundler   |

### 4.4 Communication Interfaces
- All communication between the frontend (client) and backend (server) shall use **HTTP/HTTPS** with **JSON** as the data exchange format.
- All API requests to protected routes must include the Authorization header in the format: `Authorization: Bearer <jwt_token>`.
- CORS (Cross-Origin Resource Sharing) must be configured on the backend to allow requests from the frontend origin.

---

## 5. Non-Functional Requirements

### 5.1 Security Requirements

| NFR ID  | Requirement                                                                                                   |
|---------|---------------------------------------------------------------------------------------------------------------|
| NFR-S1  | All passwords must be stored as bcrypt hashes. Plain-text passwords must never be stored or logged.           |
| NFR-S2  | JWT tokens must expire after 24 hours. Expired tokens must be rejected with a `401 Unauthorized` response.    |
| NFR-S3  | All protected API endpoints must validate the JWT token on every request — no session persistence on the server. |
| NFR-S4  | Role-based middleware must enforce that buyers cannot release funds, sellers cannot refund, etc.               |
| NFR-S5  | The system must not expose sensitive user data (passwords, internal IDs) in API responses unnecessarily.       |
| NFR-S6  | MongoDB queries must use parameterized inputs via Mongoose to prevent NoSQL injection attacks.                 |

### 5.2 Performance Requirements

| NFR ID  | Requirement                                                                                     |
|---------|-------------------------------------------------------------------------------------------------|
| NFR-P1  | Standard API responses (CRUD operations) must complete within 500ms under normal load.          |
| NFR-P2  | The React frontend must achieve a first contentful paint (FCP) under 3 seconds on broadband.   |
| NFR-P3  | The system must handle at least 50 concurrent API requests without degraded response times.     |

### 5.3 Reliability Requirements

| NFR ID  | Requirement                                                                                            |
|---------|--------------------------------------------------------------------------------------------------------|
| NFR-R1  | The transaction state machine must strictly enforce valid transitions — no state can be skipped.        |
| NFR-R2  | No escrow account must retain a non-zero balance after its status has been set to `RELEASED` or `REFUNDED`. |
| NFR-R3  | Database connection errors must be caught and handled gracefully, returning `503 Service Unavailable`. |
| NFR-R4  | All unhandled exceptions in the backend must be caught by the global error handler middleware and must not crash the server. |

### 5.4 Usability Requirements

| NFR ID  | Requirement                                                                                               |
|---------|-----------------------------------------------------------------------------------------------------------|
| NFR-U1  | The application must be fully usable on both desktop and mobile screen sizes without horizontal scrolling.|
| NFR-U2  | All user-facing error messages must be human-readable and actionable (not raw server errors).             |
| NFR-U3  | All form inputs must be validated client-side before submission to prevent unnecessary API calls.         |
| NFR-U4  | Users must receive clear visual feedback (status badges, toast notifications) for every action they take. |

### 5.5 Maintainability Requirements

| NFR ID  | Requirement                                                                                             |
|---------|---------------------------------------------------------------------------------------------------------|
| NFR-M1  | The backend must follow the MVC (Model–View–Controller) pattern separating models, controllers, and routes. |
| NFR-M2  | Environment-specific configuration (port, database URI, JWT secret) must be stored in `.env` files and not hardcoded. |
| NFR-M3  | All API routes must be organized in dedicated route files separated from controller logic.              |

---

## 6. System Constraints

| Constraint ID | Description                                                                                          |
|---------------|------------------------------------------------------------------------------------------------------|
| CON-01        | Technology stack is fixed: MongoDB, Express.js, React.js (Vite), Node.js. No alternatives permitted. |
| CON-02        | The project budget is $0. Only free-tier services and open-source libraries may be used.             |
| CON-03        | The project timeline is 4–6 weeks from requirements gathering to final presentation.                 |
| CON-04        | No real financial transactions or payment gateway integrations are permitted in v1.0.0.              |
| CON-05        | The ADMIN role cannot be self-registered. Admin accounts must be manually seeded into the database.  |
| CON-06        | Mutation documents are simulated as URL strings or text descriptions, not actual binary file uploads. |

---

## 7. Technical Stack

| Component          | Technology             | Version   | Purpose                                      |
|--------------------|------------------------|-----------|----------------------------------------------|
| Frontend Runtime   | React.js               | ≥ 18.x    | Component-based UI library                   |
| Frontend Build     | Vite                   | ≥ 4.x     | Dev server and production bundler            |
| Frontend Styling   | Tailwind CSS           | ≥ 3.x     | Utility-first CSS framework                  |
| Frontend Routing   | React Router DOM       | ≥ 6.x     | Client-side navigation                       |
| Frontend HTTP      | Axios                  | Latest    | REST API HTTP client                         |
| Backend Runtime    | Node.js                | ≥ 18.x    | Server-side JavaScript runtime               |
| Backend Framework  | Express.js             | ≥ 4.x     | REST API routing and middleware              |
| Database           | MongoDB                | ≥ 6.x     | NoSQL document database                      |
| Database ODM       | Mongoose               | ≥ 7.x     | Schema modeling and query interface          |
| Authentication     | jsonwebtoken           | Latest    | JWT generation and verification              |
| Password Hashing   | bcryptjs               | Latest    | Secure password hashing                      |
| Dev Tooling        | nodemon                | Latest    | Auto-restart backend during development      |
| Environment Config | dotenv                 | Latest    | Load environment variables from `.env` file  |

---

## 8. Appendix — Data Models

### 8.1 User Model

| Field       | Type     | Required | Constraints                              |
|-------------|----------|----------|------------------------------------------|
| name        | String   | Yes      | Min 2 characters                         |
| email       | String   | Yes      | Unique, valid email format               |
| password    | String   | Yes      | Min 6 characters, stored as bcrypt hash  |
| role        | String   | Yes      | Enum: `BUYER`, `SELLER`, `ADMIN`         |
| phone       | String   | No       | Valid phone number format                |
| address     | String   | No       | —                                        |
| createdAt   | Date     | Auto     | Default: current timestamp              |

### 8.2 Property Model

| Field        | Type     | Required | Constraints                                         |
|--------------|----------|----------|-----------------------------------------------------|
| seller       | ObjectId | Yes      | Reference to User                                   |
| title        | String   | Yes      | Max 100 characters                                  |
| description  | String   | Yes      | Max 2000 characters                                 |
| price        | Number   | Yes      | Greater than 0                                      |
| location     | String   | Yes      | —                                                   |
| bedrooms     | Number   | Yes      | —                                                   |
| bathrooms    | Number   | Yes      | —                                                   |
| area         | Number   | Yes      | Square feet/meters                                  |
| propertyType | String   | Yes      | Enum: `APARTMENT`, `HOUSE`, `VILLA`, `COMMERCIAL`, `LAND` |
| images       | [String] | No       | Array of image URL strings                          |
| status       | String   | Auto     | Enum: `AVAILABLE`, `PENDING`, `SOLD` — Default: `AVAILABLE` |
| createdAt    | Date     | Auto     | Default: current timestamp                          |

### 8.3 Transaction Model

| Field              | Type       | Required | Constraints                                                    |
|--------------------|------------|----------|----------------------------------------------------------------|
| transactionId      | String     | Auto     | Unique, auto-generated: `TXN-{timestamp}-{random}`            |
| property           | ObjectId   | Yes      | Reference to Property                                          |
| buyer              | ObjectId   | Yes      | Reference to User                                              |
| seller             | ObjectId   | Yes      | Reference to User                                              |
| amount             | Number     | Yes      | Must match property price                                      |
| escrowAccount      | ObjectId   | Yes      | Reference to EscrowAccount                                     |
| status             | String     | Auto     | Enum: `PENDING`, `FUNDS_DEPOSITED`, `MUTATION_INITIATED`, `MUTATION_IN_PROGRESS`, `MUTATION_COMPLETED`, `FUNDS_RELEASED`, `FAILED`, `REFUNDED` |
| mutationDocuments  | [Object]   | No       | Array of `{description, uploadedAt}`                          |
| depositDate        | Date       | No       | Set when status → `FUNDS_DEPOSITED`                            |
| mutationStartDate  | Date       | No       | Set when status → `MUTATION_INITIATED`                         |
| mutationEndDate    | Date       | No       | Set when status → `MUTATION_COMPLETED`                         |
| releaseDate        | Date       | No       | Set when status → `FUNDS_RELEASED`                             |
| refundDate         | Date       | No       | Set when status → `REFUNDED`                                   |
| notes              | String     | No       | Optional admin notes                                           |
| createdAt          | Date       | Auto     | Default: current timestamp                                     |
| updatedAt          | Date       | Auto     | Updated on every save                                          |

### 8.4 EscrowAccount Model

| Field          | Type       | Required | Constraints                                                       |
|----------------|------------|----------|-------------------------------------------------------------------|
| transaction    | ObjectId   | Yes      | Unique reference to Transaction                                   |
| accountNumber  | String     | Auto     | Unique, auto-generated: `ESC-{timestamp}-{random}`               |
| balance        | Number     | Auto     | Default: `0`. Must be `0` after RELEASED or REFUNDED.             |
| currency       | String     | Auto     | Default: `USD`                                                    |
| status         | String     | Auto     | Enum: `ACTIVE`, `RELEASED`, `REFUNDED`, `CLOSED` — Default: `ACTIVE` |
| depositHistory | [Object]   | No       | Array of `{amount, date, reference, status}`                      |
| releaseHistory | [Object]   | No       | Array of `{amount, date, reference, status}`                      |
| createdAt      | Date       | Auto     | Default: current timestamp                                        |
| updatedAt      | Date       | Auto     | Updated on every save                                             |

---

## 9. Glossary

| Term              | Definition                                                                                                   |
|-------------------|--------------------------------------------------------------------------------------------------------------|
| Escrow            | A financial arrangement where a neutral third party holds funds until agreed contract conditions are fulfilled. |
| Mutation          | The legal process of transferring registered property ownership from a seller to a buyer at the land registry. |
| State Machine     | A computational model that defines a set of allowed states and the valid transitions between them.           |
| JWT               | JSON Web Token — a digitally signed token encoding user identity and role, used for stateless authentication. |
| RBAC              | Role-Based Access Control — an authorization model where system access permissions are assigned based on roles. |
| MERN Stack        | A JavaScript technology stack: MongoDB, Express.js, React.js, Node.js.                                       |
| SPA               | Single Page Application — a web app that dynamically rewrites the current page rather than reloading from the server. |
| ODM               | Object Data Modeling — mapping database documents to application-level JavaScript objects (via Mongoose).    |
| REST API          | Representational State Transfer — a stateless, resource-based API architecture using standard HTTP methods.  |
| Middleware        | Functions in Express.js that execute during the request-response cycle (e.g., authentication checks).       |
| bcrypt            | A password-hashing algorithm designed to be computationally expensive to resist brute-force attacks.         |
| Vite              | A modern, fast frontend build tool using native ES modules, designed for React and other frameworks.         |
