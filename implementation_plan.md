# Implementation Plan - Escrow Account Manager

This plan outlines the creation and setup of the **Escrow Account Manager** project under `c:\Users\FH Technology Ltd\Desktop\Escrow Management System`. 

We will set up the workspace, implement a complete Node.js/Express/MongoDB backend, and provide the command instructions to set up the React + Vite frontend without scaffolding it ourselves to save tokens and respect your request.

## Proposed Changes

We will create a project directory named `escrow-account-manager` inside the directory `c:\Users\FH Technology Ltd\Desktop\Escrow Management System`.

```
Escrow Management System/
└── escrow-account-manager/
    ├── backend/
    │   ├── package.json
    │   ├── server.js
    │   ├── .env
    │   └── src/
    │       ├── config/
    │       │   └── database.js
    │       ├── models/
    │       │   ├── User.js
    │       │   ├── Property.js
    │       │   ├── Transaction.js
    │       │   └── EscrowAccount.js
    │       ├── middleware/
    │       │   ├── auth.js
    │       │   └── errorHandler.js
    │       ├── controllers/
    │       │   ├── authController.js
    │       │   ├── propertyController.js
    │       │   └── transactionController.js
    │       └── routes/
    │           ├── authRoutes.js
    │           ├── propertyRoutes.js
    │           └── transactionRoutes.js
    └── frontend/
        └── (To be initialized by user using Vite commands provided)
```

### [NEW] Backend Configuration
We will create the backend foundation:
- `package.json` with scripts to run the dev server (`npm run dev` with nodemon).
- `.env` file containing configuration keys (port, MongoDB URI, JWT secret, etc.).
- `server.js` to initialize the Express app, middleware (CORS, JSON parsing), database connection, routes, and global error handling.
- `src/config/database.js` to manage the mongoose connection logic.

### [NEW] Models
- **User**: Name, email, password (hashed using bcrypt), role (`BUYER`, `SELLER`, `ADMIN`), phone, address.
- **Property**: Seller reference, title, description, price, location, bedrooms, bathrooms, area, propertyType, status (`AVAILABLE`, `PENDING`, `SOLD`).
- **Transaction**: Unique transaction ID, property, buyer, seller, amount, status (`PENDING`, `FUNDS_DEPOSITED`, `MUTATION_INITIATED`, `MUTATION_IN_PROGRESS`, `MUTATION_COMPLETED`, `FUNDS_RELEASED`, `FAILED`, `REFUNDED`), mutation documents, release/refund dates.
- **EscrowAccount**: Transaction reference, unique account number, balance, status (`ACTIVE`, `RELEASED`, `REFUNDED`, `CLOSED`), deposit and release histories.

### [NEW] Middleware
- **auth.js**: Protect routes via JWT verification and restrict access by role (`protect`, `authorize('BUYER', 'SELLER', 'ADMIN')`).
- **errorHandler.js**: Centralized error middleware to respond cleanly with appropriate HTTP status codes.

### [NEW] Controllers & Routes
- **authController**: Handlers for registering, logging in, and retrieving the current logged-in user's profile.
- **propertyController**: CRUD operations for property listings (Create, Read, Update, Delete) with validation to verify that only sellers/admins can edit/delete their listings.
- **transactionController**: Core business logic implementing the secure escrow workflow:
  - `initiateTransaction`: Buyer starts a transaction (sets property to `PENDING`).
  - `depositFunds`: Buyer deposits the exact property price to the escrow account (sets state to `FUNDS_DEPOSITED`).
  - `initiateMutation`: Seller indicates that the legal mutation process has started.
  - `uploadMutationDocument`: Seller uploads mutation progress/documents (simulated metadata).
  - `completeMutation`: Seller/Admin marks the mutation as successfully done.
  - `releaseFunds`: Admin triggers release of escrowed money to the seller (sets property to `SOLD`).
  - `refundBuyer`: Admin refunds the money to the buyer in case of mutation failure or cancellation.

---

## Verification Plan

### Automated Verification
- We will verify that the server launches successfully without errors using `node server.js` or `npm run dev` (we will check console logs for database connection).
- We will verify API endpoints using PowerShell commands or curl if needed.

### Manual Verification
- Once the backend is fully operational, we will provide you with the commands to install the Vite React frontend.
- You will run the command `npm run dev` to start the frontend server.
