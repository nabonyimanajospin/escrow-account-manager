# Implementation Plan - Escrow Account Manager

This document outlines the architecture, database schema, and workflows of the **Escrow Account Manager** project located at `c:\Users\FH Technology Ltd\Desktop\Escrow Management System`. 

---

## Technical Stack & Database
- **Backend Architecture**: Node.js, Express, Sequelize ORM.
- **Primary Database**: PostgreSQL (configured on port `5432` with database `escrow_db`).
- **Frontend Architecture**: React (Vite-based build, SPA routing).
- **Security**: JWT-based authentication headers (Buyer, Seller, and Admin roles).

---

## Domain Data Models (PostgreSQL / Sequelize)

### 1. User Model
*   Stores user profiles, roles, and credentials.
*   **Attributes**:
    *   `id` (Primary Key)
    *   `name` (String, e.g., "Jospin Nabonyimana")
    *   `email` (String, Unique)
    *   `password` (Hashed using bcryptjs)
    *   `role` (Enum: `BUYER`, `SELLER`, `ADMIN`)
    *   `phone` (String)
    *   `address` (String)

### 2. Property Model
*   Represents catalog property listings owned by sellers.
*   **Attributes**:
    *   `id` (Primary Key)
    *   `sellerId` (Foreign Key -> User)
    *   `title` (String, e.g., "Kiyovu Luxury Villa")
    *   `description` (Text)
    *   `price` (Decimal)
    *   `location` (String)
    *   `bedrooms` / `bathrooms` (Integer)
    *   `area` (Decimal)
    *   `propertyType` (Enum: `APARTMENT`, `HOUSE`, `VILLA`, `COMMERCIAL`, `LAND`)
    *   `status` (Enum: `AVAILABLE`, `PENDING`, `SOLD`)

### 3. Transaction Model
*   Core state machine tracking the escrow agreement cycle.
*   **Attributes**:
    *   `id` (Primary Key)
    *   `propertyId` (Foreign Key -> Property)
    *   `buyerId` / `sellerId` (Foreign Keys -> User)
    *   `amount` (Decimal)
    *   `status` (Enum: `PENDING`, `FUNDED`, `MUTATION_STARTED`, `UNDER_REVIEW`, `COMPLETED`, `REFUNDED`)
    *   `verificationCode` (String, random 4-digit code generated per state transition)
    *   `buyerAuthorized` / `sellerAuthorized` (Boolean consensus flags)
    *   `mutationDocuments` (JSONB array storing upload urls and metadata)
    *   `escrowAccountId` (Foreign Key -> Escrow)
    *   `depositDate` / `mutationStartDate` / `mutationEndDate` / `releaseDate` / `refundDate` (Timestamps)

### 4. Escrow Model
*   Represents the simulated smart contract account custody.
*   **Attributes**:
    *   `id` (Primary Key)
    *   `transactionId` (Foreign Key -> Transaction, Unique)
    *   `accountNumber` (String, Unique)
    *   `balance` (Decimal)
    *   `contractAddress` (String, Auto-generated SHA-256 hash starting with `0x...`)
    *   `status` (Enum: `ACTIVE`, `RELEASED`, `REFUNDED`, `CLOSED`)
    *   `depositHistory` / `releaseHistory` (JSONB arrays)

### 5. AuditLog Model
*   Cryptographically chained logs representing the immutable blockchain ledger.
*   **Attributes**:
    *   `id` (Primary Key)
    *   `transactionId` (Foreign Key -> Transaction)
    *   `userId` (Foreign Key -> User)
    *   `userName` / `userRole` (String metadata)
    *   `action` (String action description)
    *   `timestamp` (Date)
    *   `signature` (String SHA-256 hash of `userId + action + timestamp`)
    *   `hash` (String SHA-256 block hash of `userId + action + timestamp + signature + previousBlockHash`)

---

## Escrow Deal State Machine Workflows

All database updates in the state machine are wrapped in **Sequelize Transactions** to ensure strict ACID atomicity.

```
 [ AVAILABLE ]
       │  (Buyer initiates)
       ▼
  [ PENDING ]  <─── Countdown Timer (10m) ─── Auto-Expired (REFUNDED)
       │  (Buyer Simulates Deposit)
       ▼
   [ FUNDED ]
       │  (Seller initiates mutation)
       ▼
[ MUTATION_STARTED ]
       │  (Seller uploads mutation deeds + submits)
       ▼
 [ UNDER_REVIEW ]
    ├─── (Admin releases) ───► [ COMPLETED ] ─── (Property marked SOLD)
    └─── (Admin rejects)  ───► [ REFUNDED ]  ─── (Property marked AVAILABLE)
```

1.  **Agreement Initiation**: Buyer opens a deal. Property status changes to `PENDING`. Escrow instance is generated with `0x...` contract address. Locked buyer active limit is enforced.
2.  **Consensus Verification**: Both Buyer and Seller must input matching 4-digit verification codes to progress state transitions. Each code input generates signature hashes in the UI.
3.  **Deposit Simulation**: Buyer locks funds into the Escrow. Balance changes from 0 to property price. Transaction status moves to `FUNDED`.
4.  **Ownership Mutation**: Seller uploads deeds and mutation files, then submits the contract for final review. Deal enters `UNDER_REVIEW`.
5.  **Admin Settle / Refund**: Admin audits deeds. Releasing settles funds to seller (Property: `SOLD`, Transaction: `COMPLETED`). Rejecting triggers a refund to buyer (Property: `AVAILABLE`, Transaction: `REFUNDED`).
