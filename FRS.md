# Functional Requirements Specification (FRS)

---

| Field              | Details                                                        |
|--------------------|----------------------------------------------------------------|
| **Document Title** | Functional Requirements Specification (FRS)                   |
| **Project Name**   | Escrow Account Manager — Property Transaction Edition          |
| **Document ID**    | EAM-FRS-001                                                    |
| **Version**        | 1.0.0                                                          |
| **Status**         | Draft                                                          |
| **Date Created**   | June 2026                                                      |
| **Last Updated**   | June 2026                                                      |
| **Author**         | Jospin Nabonyimana — Intern Developer / System Architect        |
| **Institution**    | Adventist University of Central Africa (AUCA), Faculty of Information Technology |
| **Supervisor**     | David Kubwimana — Senior Software Engineer                     |
| **Organization**   | URUTI HUB — Internship Host                                    |

---

## Revision History

| Version | Date          | Author              | Description of Changes                           |
|---------|---------------|---------------------|--------------------------------------------------|
| 0.1     | June 2026     | Jospin Nabonyimana  | Initial draft created                            |
| 1.0     | June 2026     | Jospin Nabonyimana  | Complete version submitted for supervisor review |

---

## Table of Contents

1. Purpose & Scope
2. Actors & Roles
3. Escrow Transaction State Machine
4. Use Case Flows
5. Functional Requirements Table
6. API Endpoint Specification
7. Business Rules
8. Error Handling Specification
9. Glossary

---

## 1. Purpose & Scope

### 1.1 Purpose
This Functional Requirements Specification (FRS) document provides a detailed, implementation-ready description of all functional behaviors of the Escrow Account Manager system. It translates the high-level requirements from the PRD and SRS into precise, testable functional specifications that the developer must implement.

### 1.2 Scope
This document covers:
- All system actors and their permissions.
- The complete escrow transaction lifecycle state machine.
- Detailed use case flows with pre/post conditions and alternate flows.
- A numbered functional requirements table with priority classification.
- API endpoint specifications for all backend routes.
- Business rules governing state transitions and financial operations.
- Error codes and messages for all failure scenarios.

### 1.3 Relationship to Other Documents

| Document | Relationship                                                             |
|----------|--------------------------------------------------------------------------|
| PRD      | Defines the product vision and goals that this FRS operationalizes       |
| SRS      | Defines system-level requirements that this FRS expands into use cases   |
| Implementation Plan | Guides the development sprint execution based on this FRS    |

---

## 2. Actors & Roles

| Actor  | Role Code | Description                                                                               | Registration |
|--------|-----------|-------------------------------------------------------------------------------------------|--------------|
| Buyer  | `BUYER`   | A person who wants to purchase a listed property. Deposits funds into escrow.             | Self-registers |
| Seller | `SELLER`  | A person who lists a property for sale. Initiates and manages the mutation process.       | Self-registers |
| Admin  | `ADMIN`   | System operator with full oversight. Sole authority to release or refund escrow funds.    | Manually seeded |

### Role Permissions Matrix

| Action                         | BUYER | SELLER | ADMIN |
|--------------------------------|-------|--------|-------|
| Register / Login               | Yes   | Yes    | Yes   |
| View Property Listings         | Yes   | Yes    | Yes   |
| Create Property Listing        | No    | Yes    | Yes   |
| Update / Delete Own Property   | No    | Yes    | Yes   |
| Initiate Transaction           | Yes   | No     | No    |
| Deposit Funds to Escrow        | Yes   | No     | No    |
| Initiate Mutation              | No    | Yes    | Yes   |
| Upload Mutation Documents      | No    | Yes    | Yes   |
| Complete Mutation              | No    | Yes    | Yes   |
| Release Funds to Seller        | No    | No     | Yes   |
| Refund Buyer                   | No    | No     | Yes   |
| View All Transactions          | No    | No     | Yes   |
| View Own Transactions          | Yes   | Yes    | Yes   |

---

## 3. Escrow Transaction State Machine

The transaction lifecycle is governed by a strict, linear state machine. Each state transition is triggered by a specific actor action. Invalid transitions must be rejected by the system.

```
[ PENDING ]
      │
      │  Buyer calls: POST /api/transactions/:id/deposit
      │  (Exact amount verified against property price)
      ▼
[ FUNDS_DEPOSITED ]
      │
      │  Seller calls: POST /api/transactions/:id/initiate-mutation
      ▼
[ MUTATION_INITIATED ]
      │
      │  Seller calls: POST /api/transactions/:id/upload-document
      ▼
[ MUTATION_IN_PROGRESS ]
      │
      │  Seller/Admin calls: POST /api/transactions/:id/complete-mutation
      ▼
[ MUTATION_COMPLETED ]
      │
      ├──── Admin calls: POST /api/transactions/:id/release
      │           └──→ [ FUNDS_RELEASED ]  →  Property: SOLD
      │
      └──── Admin calls: POST /api/transactions/:id/refund
                  └──→ [ REFUNDED ]        →  Property: AVAILABLE
```

### State Definitions

| State                | Description                                                                       |
|----------------------|-----------------------------------------------------------------------------------|
| `PENDING`            | Transaction created; escrow account exists but has no funds.                      |
| `FUNDS_DEPOSITED`    | Buyer has deposited the full property price; escrow balance equals property price. |
| `MUTATION_INITIATED` | Seller has officially started the legal property ownership transfer process.       |
| `MUTATION_IN_PROGRESS` | Seller has uploaded proof documentation; mutation is actively underway.          |
| `MUTATION_COMPLETED` | Seller confirms the ownership transfer is legally complete.                       |
| `FUNDS_RELEASED`     | Admin has verified and released escrow funds to the seller. Escrow balance = 0.   |
| `REFUNDED`           | Admin has triggered refund. Buyer receives virtual funds back. Escrow balance = 0.|
| `FAILED`             | System error or exceptional case; transaction is invalid.                         |

---

## 4. Use Case Flows

### UC-01: User Registration

- **Actor:** Buyer or Seller
- **Preconditions:** User is not yet registered. The provided email does not already exist in the system.
- **Postconditions:** A new user account is created. A JWT token is returned to the client.

**Main Flow:**
1. User submits registration form with: name, email, password, role, phone, and address.
2. System validates all required fields are present and correctly formatted.
3. System checks that no existing user has the same email address.
4. System hashes the password using bcrypt (10 salt rounds).
5. System persists the new user record to the database.
6. System generates and returns a signed JWT token and user profile (excluding password).

**Alternate Flow — Email Already Exists:**
- At step 3, if the email is already registered, the system returns `400 Bad Request` with message: `"User already exists"`.

---

### UC-02: User Login

- **Actor:** Buyer, Seller, or Admin
- **Preconditions:** User has a registered account.
- **Postconditions:** User receives a valid JWT token.

**Main Flow:**
1. User submits login form with email and password.
2. System looks up the user by email, including the password field.
3. System compares the submitted password against the stored bcrypt hash.
4. System generates and returns a signed JWT token and user profile.

**Alternate Flow — Invalid Credentials:**
- At step 2, if no user is found, or at step 3, if password does not match, the system returns `401 Unauthorized` with message: `"Invalid credentials"`.

---

### UC-03: Create Property Listing

- **Actor:** Seller
- **Preconditions:** User is authenticated with role `SELLER` or `ADMIN`.
- **Postconditions:** A new property listing is created with status `AVAILABLE`.

**Main Flow:**
1. Seller submits a property creation form with all required fields.
2. System validates all fields (title, description, price, location, bedrooms, bathrooms, area, property type).
3. System creates the property record, linking it to the authenticated seller.
4. System sets property status to `AVAILABLE`.
5. System returns the created property record.

**Alternate Flow — Unauthorized Role:**
- If the user's role is `BUYER`, the system returns `403 Forbidden`.

---

### UC-04: Initiate Transaction (Buyer)

- **Actor:** Buyer
- **Preconditions:** Buyer is authenticated. The target property has status `AVAILABLE`. The buyer is not the seller of the property.
- **Postconditions:** A transaction record and linked escrow account are created. Property status changes to `PENDING`.

**Main Flow:**
1. Buyer clicks "Buy Property" on a listing page.
2. System verifies the property is `AVAILABLE` and the buyer is not its seller.
3. System creates a Transaction record with: unique `transactionId`, buyer, seller, amount (= property price), status `PENDING`.
4. System creates an EscrowAccount record with: unique `accountNumber`, balance `0`, status `ACTIVE`, linked to the transaction.
5. System updates the property status to `PENDING`.
6. System links the escrow account to the transaction.
7. System returns the transaction and escrow account details.

**Alternate Flow — Property Not Available:**
- At step 2, if property is `PENDING` or `SOLD`, system returns `400 Bad Request`: `"Property is not available for transaction"`.

**Alternate Flow — Buyer Is Seller:**
- At step 2, if buyer ID matches seller ID, system returns `400 Bad Request`: `"You cannot buy your own property"`.

---

### UC-05: Deposit Funds to Escrow

- **Actor:** Buyer
- **Preconditions:** Transaction exists with status `PENDING`. The requesting user is the buyer of the transaction.
- **Postconditions:** Escrow balance equals property price. Transaction status = `FUNDS_DEPOSITED`.

**Main Flow:**
1. Buyer submits the deposit form with the amount and an optional payment reference.
2. System verifies the requesting user is the buyer of the transaction.
3. System verifies the transaction is in `PENDING` state.
4. System verifies the deposited amount exactly matches the transaction amount.
5. System updates the escrow account: adds the amount to balance, pushes a deposit history entry.
6. System updates the transaction: status → `FUNDS_DEPOSITED`, sets `depositDate`.
7. System returns the updated transaction record.

**Alternate Flow — Amount Mismatch:**
- At step 4, if amount ≠ transaction amount, system returns `400 Bad Request`: `"Amount must be exactly {property_price}"`.

**Alternate Flow — Wrong User:**
- At step 2, if the requesting user is not the buyer, system returns `403 Forbidden`: `"Only the buyer can deposit funds"`.

---

### UC-06: Initiate Mutation Process (Seller)

- **Actor:** Seller
- **Preconditions:** Transaction exists with status `FUNDS_DEPOSITED`. The requesting user is the seller of the transaction.
- **Postconditions:** Transaction status = `MUTATION_INITIATED`. Mutation start date is recorded.

**Main Flow:**
1. Seller clicks "Start Mutation Process" on the transaction detail page.
2. System verifies the requesting user is the seller.
3. System verifies transaction is in `FUNDS_DEPOSITED` state.
4. System updates transaction: status → `MUTATION_INITIATED`, sets `mutationStartDate`.
5. System returns the updated transaction.

---

### UC-07: Upload Mutation Document (Seller)

- **Actor:** Seller
- **Preconditions:** Transaction exists with status `MUTATION_INITIATED`. The requesting user is the seller.
- **Postconditions:** Transaction status = `MUTATION_IN_PROGRESS`. Document reference is logged.

**Main Flow:**
1. Seller submits a mutation document reference (URL or description text).
2. System verifies the requesting user is the seller.
3. System appends the document reference to the transaction's `mutationDocuments` array.
4. System updates transaction status → `MUTATION_IN_PROGRESS`.
5. System returns the updated transaction.

---

### UC-08: Complete Mutation (Seller / Admin)

- **Actor:** Seller or Admin
- **Preconditions:** Transaction status is `MUTATION_IN_PROGRESS`.
- **Postconditions:** Transaction status = `MUTATION_COMPLETED`. Mutation end date is recorded.

**Main Flow:**
1. Seller or Admin marks mutation as complete.
2. System verifies transaction is in `MUTATION_IN_PROGRESS` state.
3. System updates transaction: status → `MUTATION_COMPLETED`, sets `mutationEndDate`.
4. System returns the updated transaction.

---

### UC-09: Release Escrow Funds to Seller (Admin)

- **Actor:** Admin
- **Preconditions:** Transaction status is `MUTATION_COMPLETED`. Requesting user has `ADMIN` role.
- **Postconditions:** Escrow balance = 0. Transaction status = `FUNDS_RELEASED`. Property status = `SOLD`.

**Main Flow:**
1. Admin reviews the mutation documents and confirms completion.
2. Admin clicks "Release Escrow Funds".
3. System verifies the transaction is in `MUTATION_COMPLETED` state.
4. System reads the escrow account balance.
5. System sets escrow balance to `0`, status → `RELEASED`, appends release history entry.
6. System updates transaction: status → `FUNDS_RELEASED`, sets `releaseDate`.
7. System updates property: status → `SOLD`.
8. System returns updated transaction with confirmation of amount released.

**Alternate Flow — Wrong Transaction State:**
- At step 3, if transaction is not `MUTATION_COMPLETED`, system returns `400 Bad Request`: `"Transaction must be in MUTATION_COMPLETED state"`.

---

### UC-10: Refund Buyer (Admin)

- **Actor:** Admin
- **Preconditions:** Transaction is in an active mutation state (`MUTATION_INITIATED`, `MUTATION_IN_PROGRESS`, or `MUTATION_COMPLETED`). Requesting user has `ADMIN` role.
- **Postconditions:** Escrow balance = 0. Transaction status = `REFUNDED`. Property status = `AVAILABLE`.

**Main Flow:**
1. Admin determines that mutation has failed or been canceled.
2. Admin clicks "Cancel & Refund Buyer".
3. System verifies transaction is in a refundable state.
4. System reads the escrow account balance.
5. System sets escrow balance to `0`, status → `REFUNDED`.
6. System updates transaction: status → `REFUNDED`, sets `refundDate`.
7. System updates property: status → `AVAILABLE`.
8. System returns updated transaction with confirmation of amount refunded.

---

## 5. Functional Requirements Table

| FR ID  | Priority | Actor   | Requirement Description                                                                                          |
|--------|----------|---------|------------------------------------------------------------------------------------------------------------------|
| FR-001 | P0       | Any     | The system shall provide a `POST /api/auth/register` endpoint accepting name, email, password, role, phone, address. |
| FR-002 | P0       | Any     | The system shall hash all passwords using bcrypt before storage and never return the password in API responses.  |
| FR-003 | P0       | Any     | The system shall provide a `POST /api/auth/login` endpoint that returns a signed JWT upon valid credentials.     |
| FR-004 | P0       | Any     | The system shall validate JWT tokens on all protected routes and return `401` for missing or invalid tokens.     |
| FR-005 | P0       | Any     | The system shall enforce role-based middleware on all role-restricted routes and return `403` for unauthorized roles. |
| FR-006 | P0       | SELLER  | The system shall allow `SELLER` and `ADMIN` roles to create property listings via `POST /api/properties`.        |
| FR-007 | P0       | Any     | The system shall return all property listings via `GET /api/properties`.                                         |
| FR-008 | P0       | Any     | The system shall return a single property via `GET /api/properties/:id`.                                         |
| FR-009 | P0       | SELLER  | The system shall allow the owning seller or admin to update a listing via `PUT /api/properties/:id`.             |
| FR-010 | P0       | SELLER  | The system shall allow the owning seller or admin to delete a listing via `DELETE /api/properties/:id`.          |
| FR-011 | P0       | BUYER   | The system shall allow a buyer to initiate a transaction via `POST /api/transactions/initiate`.                  |
| FR-012 | P0       | BUYER   | The system shall prevent a buyer from initiating a transaction on their own property listing.                    |
| FR-013 | P0       | BUYER   | The system shall prevent a transaction from being initiated on a property that is not `AVAILABLE`.               |
| FR-014 | P0       | System  | Upon transaction initiation, the system shall auto-create an EscrowAccount with balance `0` and a unique account number. |
| FR-015 | P0       | BUYER   | The system shall allow a buyer to deposit funds via `POST /api/transactions/:id/deposit`.                        |
| FR-016 | P0       | System  | The system shall reject deposits where the amount does not exactly match the property price.                     |
| FR-017 | P0       | SELLER  | The system shall allow the transaction seller to initiate mutation via `POST /api/transactions/:id/initiate-mutation`. |
| FR-018 | P0       | SELLER  | The system shall allow the seller to upload mutation documents via `POST /api/transactions/:id/upload-document`. |
| FR-019 | P0       | SELLER  | The system shall allow the seller or admin to mark mutation as complete via `POST /api/transactions/:id/complete-mutation`. |
| FR-020 | P0       | ADMIN   | The system shall allow only `ADMIN` to release escrow funds via `POST /api/transactions/:id/release`.            |
| FR-021 | P0       | ADMIN   | The system shall allow only `ADMIN` to refund the buyer via `POST /api/transactions/:id/refund`.                 |
| FR-022 | P0       | System  | After fund release or refund, the EscrowAccount balance must be set to exactly `0`.                              |
| FR-023 | P1       | System  | All deposit events must be appended to the escrow account `depositHistory` array with amount, date, and reference. |
| FR-024 | P1       | System  | All release events must be appended to the escrow account `releaseHistory` array with amount, date, and reference. |
| FR-025 | P1       | Any     | Authenticated users shall retrieve their own transactions via `GET /api/transactions/my`.                        |
| FR-026 | P1       | ADMIN   | Admin shall be able to retrieve all transactions via `GET /api/transactions`.                                    |
| FR-027 | P1       | Any     | The system shall record timestamps: `depositDate`, `mutationStartDate`, `mutationEndDate`, `releaseDate`, `refundDate`. |

---

## 6. API Endpoint Specification

### 6.1 Authentication Endpoints

| Method | Endpoint                | Auth Required | Role    | Description                          |
|--------|-------------------------|---------------|---------|--------------------------------------|
| POST   | `/api/auth/register`    | No            | Any     | Register a new user account          |
| POST   | `/api/auth/login`       | No            | Any     | Login and receive JWT token          |
| GET    | `/api/auth/me`          | Yes           | Any     | Get current authenticated user profile |

### 6.2 Property Endpoints

| Method | Endpoint                | Auth Required | Role              | Description                         |
|--------|-------------------------|---------------|-------------------|-------------------------------------|
| GET    | `/api/properties`       | Yes           | Any               | Get all property listings           |
| POST   | `/api/properties`       | Yes           | SELLER, ADMIN     | Create a new property listing       |
| GET    | `/api/properties/:id`   | Yes           | Any               | Get details of a single property    |
| PUT    | `/api/properties/:id`   | Yes           | SELLER (owner), ADMIN | Update a property listing     |
| DELETE | `/api/properties/:id`   | Yes           | SELLER (owner), ADMIN | Delete a property listing     |

### 6.3 Transaction & Escrow Endpoints

| Method | Endpoint                                          | Auth Required | Role              | Description                                              |
|--------|---------------------------------------------------|---------------|-------------------|----------------------------------------------------------|
| POST   | `/api/transactions/initiate`                      | Yes           | BUYER             | Initiate a new transaction (creates escrow account)      |
| POST   | `/api/transactions/:id/deposit`                   | Yes           | BUYER             | Deposit funds to the escrow account                      |
| POST   | `/api/transactions/:id/initiate-mutation`         | Yes           | SELLER            | Seller marks mutation as started                         |
| POST   | `/api/transactions/:id/upload-document`           | Yes           | SELLER            | Seller uploads mutation document reference               |
| POST   | `/api/transactions/:id/complete-mutation`         | Yes           | SELLER, ADMIN     | Mark mutation as fully completed                         |
| POST   | `/api/transactions/:id/release`                   | Yes           | ADMIN             | Admin releases escrow funds to seller                    |
| POST   | `/api/transactions/:id/refund`                    | Yes           | ADMIN             | Admin refunds buyer and cancels transaction              |
| GET    | `/api/transactions/my`                            | Yes           | BUYER, SELLER     | Get all transactions belonging to the current user       |
| GET    | `/api/transactions`                               | Yes           | ADMIN             | Get all transactions in the system                       |
| GET    | `/api/transactions/:id`                           | Yes           | Any (participant) | Get full details of a specific transaction               |

### 6.4 Standard API Response Formats

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

---

## 7. Business Rules

| BR ID  | Rule Description                                                                                                     |
|--------|----------------------------------------------------------------------------------------------------------------------|
| BR-01  | A buyer cannot initiate a transaction on a property they own (buyer ID must differ from seller ID).                  |
| BR-02  | Only one active transaction may exist per property at a time. A property in `PENDING` state cannot receive new transactions. |
| BR-03  | Deposit amounts must exactly equal the property listing price — no partial deposits or overpayments are permitted.   |
| BR-04  | Only the buyer of a transaction can deposit funds to its escrow account.                                             |
| BR-05  | Only the seller of a transaction can initiate the mutation process or upload documents.                              |
| BR-06  | Escrow funds can only be released when the transaction is in `MUTATION_COMPLETED` state.                             |
| BR-07  | Only the `ADMIN` role may execute fund release or buyer refund actions.                                              |
| BR-08  | After any final state (`FUNDS_RELEASED` or `REFUNDED`), no further state transitions are permitted on that transaction. |
| BR-09  | An escrow account balance must be exactly `0` after its status is set to `RELEASED` or `REFUNDED`.                  |
| BR-10  | Property status must always reflect the latest transaction state: `AVAILABLE` when no active transaction, `PENDING` during a transaction, `SOLD` after release, and back to `AVAILABLE` after refund. |

---

## 8. Error Handling Specification

| Error Code | HTTP Status | Scenario                                                  | Message Returned                                  |
|------------|-------------|-----------------------------------------------------------|---------------------------------------------------|
| AUTH-001   | 400         | Missing email or password in login request                | `"Please provide email and password"`             |
| AUTH-002   | 400         | Email already registered                                  | `"User already exists"`                           |
| AUTH-003   | 401         | Invalid email or password                                 | `"Invalid credentials"`                           |
| AUTH-004   | 401         | Missing or invalid JWT token                              | `"Not authorized to access this route"`           |
| AUTH-005   | 403         | User role not permitted for this action                   | `"User role {ROLE} is not authorized to access this route"` |
| PROP-001   | 404         | Property ID not found                                     | `"Property not found"`                            |
| PROP-002   | 403         | User is not the owner of the property                     | `"Not authorized to modify this property"`        |
| TXN-001    | 400         | Property is not available (PENDING or SOLD)               | `"Property is not available for transaction"`     |
| TXN-002    | 400         | Buyer attempting to buy own property                      | `"You cannot buy your own property"`              |
| TXN-003    | 404         | Transaction ID not found                                  | `"Transaction not found"`                         |
| TXN-004    | 403         | Non-buyer attempting to deposit funds                     | `"Only the buyer can deposit funds"`              |
| TXN-005    | 400         | Transaction not in the required state for the action      | `"Transaction is not in {REQUIRED_STATE} state"`  |
| TXN-006    | 400         | Deposit amount does not match property price              | `"Amount must be exactly {EXPECTED_AMOUNT}"`      |
| TXN-007    | 400         | Cannot release — mutation not yet completed               | `"Transaction must be in MUTATION_COMPLETED state"` |
| TXN-008    | 400         | Cannot refund — transaction already in a final state      | `"Cannot refund at this stage"`                   |
| SYS-001    | 500         | Unhandled server-side error                               | `"{error.message}"` (generic internal error)      |

---

## 9. Glossary

| Term                  | Definition                                                                                                 |
|-----------------------|------------------------------------------------------------------------------------------------------------|
| Escrow                | A financial arrangement where a neutral third party holds funds until agreed contract conditions are met.  |
| Mutation              | The legal process of transferring property ownership (title) from seller to buyer at the land registry.    |
| State Machine         | A model defining all possible states of a transaction and the valid, ordered transitions between them.     |
| JWT                   | JSON Web Token — a signed token used to authenticate and identify users on every API request.              |
| RBAC                  | Role-Based Access Control — access permissions are defined by the user's role (BUYER, SELLER, ADMIN).      |
| PERN Stack        | A JavaScript technology stack: PostgreSQL, Express.js, React.js, Node.js.                                  |
| ORM               | Object Relational Mapping — mapping database tables to application objects (via Sequelize).                |
