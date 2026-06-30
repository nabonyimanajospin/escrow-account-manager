# Product Requirements Document (PRD)

---

| Field              | Details                                      |
|--------------------|----------------------------------------------|
| **Document Title** | Product Requirements Document (PRD)          |
| **Project Name**   | Escrow Account Manager — Property Transaction Edition |
| **Document ID**    | EAM-PRD-001                                  |
| **Version**        | 1.0.0                                        |
| **Status**         | Draft                                        |
| **Date Created**   | June 2026                                    |
| **Last Updated**   | June 2026                                    |
| **Author**         | Jospin Nabonyimana — Intern Developer / System Architect |
| **Institution**    | Adventist University of Central Africa (AUCA), Faculty of Information Technology |
| **Supervisor**     | David Kubwimana — Senior Software Engineer   |
| **Organization**   | URUTI HUB — Internship Host                  |

---

## Revision History

| Version | Date          | Author               | Description of Changes              |
|---------|---------------|----------------------|-------------------------------------|
| 0.1     | June 2026     | Jospin Nabonyimana   | Initial draft created               |
| 1.0     | June 2026     | Jospin Nabonyimana   | First complete version for review   |

---

## Table of Contents

1. Executive Summary
2. Problem Statement
3. Goals & Objectives
4. Stakeholders
5. User Personas & Roles
6. Solution Overview
7. Core Features & Scope (MVP)
8. Out of Scope
9. Non-Functional Requirements (NFRs)
10. Assumptions & Dependencies
11. Risks & Mitigations
12. Success Metrics
13. Timeline & Milestones
14. Glossary

---

## 1. Executive Summary

The **Escrow Account Manager** is a secure, web-based platform designed to facilitate transparent and trustless high-value real estate transactions between property buyers and sellers.

In traditional property sales, both parties face high financial risks — buyers may lose money to fraudulent sellers, while sellers may transfer ownership without receiving verified payment. This system eliminates both risks by acting as a neutral digital intermediary: buyer funds are locked in a virtual escrow account and are only released to the seller after a legal property ownership transfer (called a "mutation") has been verified and confirmed by a trusted system administrator.

The system is developed as a full-stack application (PostgreSQL, Express.js, React.js, Node.js) and follows a structured SDLC approach, from requirements gathering through to deployment.

---

## 2. Problem Statement

Property transactions involve high-value financial transfers where trust is a critical issue. Three specific failure points exist in traditional, unmediated property deals:

1. **Buyer Vulnerability:** A buyer may transfer full payment to a seller, but the seller fails or refuses to complete the legal property ownership mutation, leaving the buyer with no property and no refund.

2. **Seller Vulnerability:** A seller may complete the property mutation (transferring legal ownership), but the buyer defaults on payment or provides fraudulent proof of funds, leaving the seller with no compensation.

3. **Process Transparency:** Neither party has real-time visibility into transaction progress, mutation status, or fund positions — creating confusion, disputes, and breaches of contract.

**The Opportunity:** A simple, digital escrow mechanism — enforced by a web application — can eliminate all three failure points with zero need for trust between the two parties.

---

## 3. Goals & Objectives

| ID    | Goal                                               | Objective                                                       |
|-------|----------------------------------------------------|-----------------------------------------------------------------|
| G-01  | Eliminate financial fraud in property transactions | Lock buyer funds in escrow until mutation is legally verified   |
| G-02  | Automate fund release and refund decisions         | Admin-triggered release/refund based on mutation outcome        |
| G-03  | Provide full transaction transparency              | Display real-time status to all parties at every lifecycle step |
| G-04  | Build a production-ready learning project          | Demonstrate full SDLC competence for university evaluation      |
| G-05  | Deliver a secure and scalable REST API             | JWT-protected endpoints with role-based access control (RBAC)  |

---

## 4. Stakeholders

| Stakeholder          | Role                     | Interest / Responsibility                                            |
|----------------------|--------------------------|----------------------------------------------------------------------|
| Property Buyer       | End User                 | Deposits funds into escrow; expects refund if mutation fails         |
| Property Seller      | End User                 | Lists property; initiates mutation; receives funds upon success      |
| System Administrator | Internal Operator        | Verifies mutation outcome; approves fund releases or triggers refunds|
| Internship Supervisor| Project Evaluator        | Reviews system design, code quality, and documentation               |
| University Faculty   | Academic Evaluator       | Assesses SDLC compliance, documentation, and demonstration           |
| Jospin Nabonyimana (Intern) | System Architect / Developer | Designs, builds, tests, and presents the system          |

---

## 5. User Personas & Roles

### Role 1: BUYER
- A registered user who has found a property listing and wishes to purchase it.
- Can initiate a transaction, deposit funds to escrow, and monitor transaction progress.
- Cannot release funds, refund themselves, or manage property listings.

### Role 2: SELLER
- A registered user who lists properties for sale.
- Can create, update, and delete their own property listings.
- Initiates the mutation process and uploads supporting mutation documents.
- Cannot release or refund escrow funds.

### Role 3: ADMIN
- A privileged system operator account.
- Can view all transactions and escrow accounts.
- Is the sole authority to release funds to the seller or refund the buyer.
- Can manage all users and properties in the system.

---

## 6. Solution Overview

The system holds deposited buyer funds in a transaction-specific virtual escrow account with the following guarantees:

- Funds are locked until the property mutation is verified by an Admin.
- Once mutation is confirmed as **COMPLETED**, the Admin releases funds to the Seller.
- If the mutation process **FAILS** or is canceled, the Admin triggers a full refund to the Buyer.
- Every state change is timestamped and logged, creating a full audit trail.
- No single party can complete a financial transfer unilaterally — the Admin verification step ensures integrity.

### High-Level Architecture

```
[ Browser / React SPA (Vite) ]
        |
        | HTTPS REST API (JSON)
        ↓
[ Node.js + Express.js Backend — Port 5000 ]
   ├── Authentication Middleware (JWT)
   ├── Role-Based Authorization (BUYER / SELLER / ADMIN)
   ├── Business Logic Controllers
   │     ├── Auth Controller
   │     ├── Property Controller
   │     └── Transaction / Escrow Controller
        |
        ↓
[ PostgreSQL Database (Sequelize ORM) ]
   ├── Users Table
   ├── Properties Table
   ├── Transactions Table
   └── EscrowAccounts Table
```

---

## 7. Core Features & Scope (MVP)

| Feature ID | Feature Name           | Priority | Description                                                                                              |
|------------|------------------------|----------|----------------------------------------------------------------------------------------------------------|
| F-01       | User Authentication    | P0       | Secure registration and login with JWT. Roles: `BUYER`, `SELLER`, `ADMIN`.                              |
| F-02       | Property Listings      | P0       | Sellers can create, update, and delete property listings. Buyers can browse and view listing details.    |
| F-03       | Escrow Account Creation| P0       | A unique virtual escrow account is automatically created when a buyer initiates a transaction.           |
| F-04       | Fund Deposit to Escrow | P0       | Buyer deposits the exact listing price into the escrow account. Transaction moves to `FUNDS_DEPOSITED`.  |
| F-05       | Mutation Tracking      | P0       | Seller initiates mutation, uploads proof documents. Transaction progresses through mutation states.      |
| F-06       | Fund Release           | P0       | Admin approves and releases escrowed funds to the seller upon successful mutation completion.            |
| F-07       | Fund Refund            | P0       | Admin triggers refund to buyer if mutation fails or is canceled.                                         |
| F-08       | Audit Trail / Logs     | P1       | All transactions, deposits, and releases are timestamped and stored for audit and compliance purposes.   |
| F-09       | Role-Based Dashboard   | P1       | Each user role (Buyer, Seller, Admin) sees a contextual dashboard showing relevant data and actions.     |
| F-10       | Status Notifications   | P2       | In-app status indicators notify all parties of real-time state changes in their transactions.            |

---

## 8. Out of Scope

The following items are explicitly excluded from version 1.0.0 of this system:

- Real bank or payment gateway integration (e.g., Stripe, PayPal, M-Pesa) — funds are simulated/virtual.
- SMS or email notification delivery (notification logic is designed but not integrated with a live provider).
- Document OCR or legal mutation document authentication.
- Multi-currency support.
- Mobile native applications (iOS / Android).
- Advanced analytics dashboards or reporting modules.
- Integration with government land registry APIs.

---

## 9. Non-Functional Requirements (NFRs)

| NFR ID | Category     | Requirement                                                                                         |
|--------|--------------|-----------------------------------------------------------------------------------------------------|
| NFR-01 | Security     | All passwords must be hashed using bcrypt (minimum 10 salt rounds) before storage.                 |
| NFR-02 | Security     | All API routes (except login and register) must be protected by JWT Bearer token validation.        |
| NFR-03 | Security     | Role-based access control (RBAC) must prevent unauthorized actions (e.g., buyer cannot release funds). |
| NFR-04 | Performance  | API response time must be under 500ms for standard requests under normal load.                      |
| NFR-05 | Performance  | Frontend page load time must be under 3 seconds on a standard broadband connection.                 |
| NFR-06 | Reliability  | The transaction state machine must prevent invalid state transitions (e.g., skipping from PENDING to FUNDS_RELEASED). |
| NFR-07 | Reliability  | No escrow account must ever have a non-zero balance after RELEASED or REFUNDED status.              |
| NFR-08 | Usability    | The frontend must be responsive and functional on both desktop (1920×1080) and mobile (375px width) screens. |
| NFR-09 | Maintainability | Code must follow a modular MVC (Model-View-Controller) architecture for clarity and extensibility. |
| NFR-10 | Scalability  | The system architecture must support future horizontal scaling of the backend via stateless JWT authentication. |

---

## 10. Assumptions & Dependencies

### Assumptions
- PostgreSQL instance (local or cloud) is available and accessible.
- Node.js v18 or higher and npm v9 or higher are installed on the development machine.
- Fund transfers are simulated virtually within the application — no real banking API is used.
- The Admin role is created manually (seeded into the database); there is no self-registration for Admin accounts.
- The mutation documents uploaded by Sellers are stored as URL strings or text descriptions (no binary file storage in v1.0.0).

### Dependencies

| Dependency         | Version  | Purpose                                     |
|--------------------|----------|---------------------------------------------|
| Node.js            | ≥ 18.x   | Backend JavaScript runtime                  |
| Express.js         | ≥ 4.x    | Backend REST API framework                  |
| PostgreSQL         | ≥ 15.x   | Relational database                         |
| Sequelize          | ≥ 6.x    | PostgreSQL object relational mapping (ORM)  |
| React.js           | ≥ 18.x   | Frontend user interface library             |
| Vite               | ≥ 4.x    | Frontend build tool and dev server          |
| JSON Web Token     | Latest   | Stateless authentication tokens             |
| bcryptjs           | Latest   | Password hashing library                    |
| Axios              | Latest   | HTTP client for frontend API calls          |
| React Router DOM   | ≥ 6.x    | Client-side routing for the React SPA       |
| Tailwind CSS       | ≥ 3.x    | Utility-first CSS framework for styling     |

---

## 11. Risks & Mitigations

| Risk ID | Risk Description                                               | Likelihood | Impact | Mitigation Strategy                                              |
|---------|----------------------------------------------------------------|------------|--------|------------------------------------------------------------------|
| R-01    | PostgreSQL connection failure in development environment       | Medium     | High   | Use connection error handling with clear console error messages  |
| R-02    | JWT token expiry causes session disruption for active users    | Low        | Medium | Implement token refresh logic; show clear session expired UI     |
| R-03    | Incorrect transaction state transitions leading to fund loss   | Low        | Critical | Implement strict state machine validation in controller logic   |
| R-04    | Developer unfamiliarity with JavaScript/Node.js (learning curve) | High    | Medium | Follow step-by-step implementation plan; use descriptive comments |
| R-05    | Scope creep during development extending project timeline      | Medium     | Medium | Strictly follow MVP feature list (F-01 to F-08 only)            |
| R-06    | Missing or incomplete documentation for supervisor review      | Low        | High   | All three documents (PRD, SRS, FRS) are maintained and updated  |

---

## 12. Success Metrics

| Metric ID | Metric                                     | Target Value                             |
|-----------|--------------------------------------------|------------------------------------------|
| SM-01     | Escrow balance accuracy                    | 100% — all completed escrow accounts must close at balance = 0 |
| SM-02     | Transaction security                       | Zero cases of fund release without Admin verification |
| SM-03     | Unauthorized access prevention             | Zero successful API calls without valid JWT on protected routes |
| SM-04     | State machine integrity                    | Zero invalid state transitions in any transaction lifecycle     |
| SM-05     | Project presentation readiness            | All features from F-01 to F-08 functional and demonstrable      |

---

## 13. Timeline & Milestones

| Phase | Milestone                                      | Target Completion |
|-------|------------------------------------------------|-------------------|
| 1     | Requirements Documentation (PRD, SRS, FRS)    | Week 1            |
| 2     | Backend: Database models & auth system         | Week 2            |
| 3     | Backend: Escrow transaction controller logic   | Week 2–3          |
| 4     | Frontend: React app scaffolding (Vite)         | Week 3            |
| 5     | Frontend: UI components & API integration      | Week 3–4          |
| 6     | Integration testing & bug fixing               | Week 4–5          |
| 7     | Deployment (Render + Vercel or local demo)     | Week 5–6          |
| 8     | Final review & supervisor presentation         | Week 6            |

---

## 14. Glossary

| Term              | Definition                                                                                       |
|-------------------|--------------------------------------------------------------------------------------------------|
| Escrow            | A financial arrangement where a neutral third party temporarily holds funds until agreed conditions are fulfilled. |
| Mutation          | The legal process of transferring property ownership from a seller to a buyer in a land registry. |
| JWT               | JSON Web Token — a compact, URL-safe standard for securely transmitting claims between parties.  |
| PERN Stack        | A technology stack comprising PostgreSQL, Express.js, React.js, and Node.js.                     |
| SPA               | Single Page Application — a web app that loads a single HTML page and dynamically updates content. |
| RBAC              | Role-Based Access Control — a security model restricting system access based on user roles.      |
| REST API          | Representational State Transfer API — an architectural style for networked hypermedia applications. |
| MVP               | Minimum Viable Product — the smallest feature set required to deliver core product value.        |
| SDLC              | Software Development Life Cycle — a structured process for planning, creating, testing, and delivering software. |
| ORM               | Object Relational Mapping — a technique for mapping database tables to application objects (Sequelize). |
