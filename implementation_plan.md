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





































































Escrow Account Manager — Complete Build Plan
Backend fixes + world-class premium frontend with full end-to-end API integration.

User Review Required
IMPORTANT

This is a massive build covering ~25 files. The frontend will be completely rebuilt from scratch with a premium dark-mode glass UI, animated transitions, role-based dashboards, and full transaction lifecycle connected to every backend endpoint. Please review and approve before I begin.

WARNING

The existing frontend components (Login, Register, Dashboard, PropertyList, PropertyForm, Navbar, Footer) will be completely rewritten with a new premium design system. The existing code uses basic Tailwind classes — the new version will use glassmorphism, gradients, micro-animations, and a dark premium theme.

Open Questions
IMPORTANT

Admin registration: Your Register form currently allows selecting ADMIN role. Per PRD, ADMIN should be seeded only. Should I remove ADMIN from the register dropdown and keep it seed-only? (I'll do this by default — just flag if you disagree.)
Currency: The PRD uses USD. Should I keep USD or switch to RWF (Rwandan Franc) since the context is Kigali?
Proposed Changes
Backend Fixes
[NEW] 
seed.js
Creates a default ADMIN user (email: admin@escrowtrust.com, password: Admin@123)
Run with node seed.js to populate the database
Prevents duplicate creation if admin already exists
[MODIFY] 
propertyRoutes.js
Make GET /api/properties and GET /api/properties/:id public (remove protect)
Sellers/Admin still need auth for create/update/delete
[MODIFY] 
transactionController.js
Fix Dashboard.jsx references to _id → id (Sequelize uses id, not MongoDB's _id)
This is actually a frontend fix but the controller getTransactions also needs to support ADMIN getting all transactions via /transactions route AND via /transactions/my
[MODIFY] 
server.js
Add express.urlencoded({ extended: true }) for form compatibility
Add CORS configuration with specific frontend origin
Frontend — Complete Premium Rebuild
The design philosophy: Dark glassmorphism theme with emerald/teal accents, animated cards, smooth page transitions, gradient backgrounds, floating particles, and micro-interactions on every clickable element. Think Stripe Dashboard meets luxury real estate platform.

Design System & Foundation
[MODIFY] 
index.html
Add Google Fonts (Inter + Outfit)
SEO meta tags, proper title, favicon
Open Graph tags for social sharing
[MODIFY] 
index.css
Complete premium design system with CSS custom properties
Dark mode color palette with emerald/teal accent gradients
Glassmorphism utility classes (backdrop blur, glass borders)
Animation keyframes (float, pulse-glow, shimmer, slide-in)
Premium button styles with hover glow effects
Status badge styles with color-coded indicators
Responsive typography scale
[MODIFY] 
App.jsx
Complete rewrite with React Router v7
Route structure: Landing, Login, Register, Dashboard, Properties (list/detail/create), Transactions (list/detail), 404
Protected routes with role-based guards
Layout wrapper with Navbar + Footer
Toast notification provider (react-hot-toast)
Pages & Components (20+ files)
[NEW] 
LandingPage.jsx
Stunning hero section with animated gradient background
Floating particles/dots animation
"How It Works" section with 3-step visual flow (Deposit → Mutation → Release)
Feature cards with glassmorphism and hover animations
Statistics counter section (animated numbers)
Testimonials section
CTA buttons with glow effects → links to Register/Login
[MODIFY] 
Navbar.jsx
Glassmorphism navbar with backdrop blur
Animated logo with gradient text
Mobile hamburger menu with slide-in animation
Role badge with glow effect
Smooth scroll behavior on landing page
Active link indicator with animated underline
[MODIFY] 
Footer.jsx
Multi-column footer with gradient top border
Quick links, contact info, social icons
Built-with-love credit
[MODIFY] 
Login.jsx
Split-screen design: left side animated illustration, right side form
Glassmorphism card on dark gradient background
Input fields with floating labels and focus glow
Animated submit button with loading state
Error shake animation
[MODIFY] 
Register.jsx
Multi-step registration feel (visually grouped sections)
Role selection with visual cards (Buyer/Seller) instead of dropdown
Remove ADMIN option (seed-only per PRD)
Animated progress indicator
Password strength indicator
[MODIFY] 
Dashboard.jsx
Role-specific dashboards (Buyer sees different UI than Seller than Admin)
Animated stat cards with gradient icons and count-up animation
Glassmorphism cards throughout
Interactive transaction timeline
Quick action buttons with ripple effects
Recent activity feed with live-feel updates
Fix _id references → id (Sequelize IDs, not MongoDB)
[MODIFY] 
PropertyList.jsx
Premium property cards with gradient overlays on image area
Animated hover effects (card lift + shadow)
Status badges with pulse animation
Grid/list view toggle
Advanced filter bar with animation
Fix _id references → id
[NEW] 
PropertyDetail.jsx
Full property detail page with hero header
Property specs in icon-grid layout
Seller info card
"Initiate Transaction" button (BUYER) → calls POST /api/transactions/initiate
Edit/Delete buttons (SELLER owner)
Price display with glassmorphism treatment
Back navigation
[MODIFY] 
PropertyForm.jsx
Premium form with glassmorphism card
Property type selection as visual icon cards
Image URL input fields
Real-time form validation feedback
Animated submit
[NEW] 
TransactionList.jsx
All user transactions in a premium table/card view
Status badges with color-coded pills
Filter by status
Amount formatting with currency
Click through to TransactionDetail
Different endpoints for ADMIN (/transactions) vs BUYER/SELLER (/transactions/my)
[NEW] 
TransactionDetail.jsx
This is the most important page — the escrow workspace:

Visual state machine timeline showing all 8 transaction states as a progress tracker
Current state highlighted with animation
Escrow account card showing balance, account number, deposit/release history
Action buttons based on role + state:
BUYER + PENDING → "Deposit Funds" button → calls POST /:id/deposit
SELLER + FUNDS_DEPOSITED → "Initiate Mutation" → calls POST /:id/initiate-mutation
SELLER + MUTATION_INITIATED/IN_PROGRESS → "Upload Document" → calls POST /:id/upload-document
SELLER/ADMIN + MUTATION_IN_PROGRESS → "Complete Mutation" → calls POST /:id/complete-mutation
ADMIN + MUTATION_COMPLETED → "Release Funds" → calls POST /:id/release
ADMIN + refundable states → "Refund Buyer" → calls POST /:id/refund
Document upload history display
Buyer/Seller info cards
Property summary card
Confirmation modals for release/refund
[NEW] 
StatusBadge.jsx
Reusable component for transaction/property status display
Color-coded with subtle animation for active states
[NEW] 
ConfirmModal.jsx
Premium confirmation modal with backdrop blur
Used for critical actions (release funds, refund, delete property)
Animated entrance/exit
[NEW] 
NotFound.jsx
404 page with animated illustration
Link back to dashboard
[MODIFY] 
LoadingSpinner.jsx
Premium spinner with gradient and pulsing animation
API Endpoint Coverage (End-to-End)
Every backend endpoint will be connected:

Endpoint	Frontend Component	User Action
POST /api/auth/register	Register.jsx	Create account
POST /api/auth/login	Login.jsx	Sign in
GET /api/auth/me	AuthContext.jsx	Check session
GET /api/properties	PropertyList.jsx, LandingPage.jsx	Browse catalog
GET /api/properties/:id	PropertyDetail.jsx	View details
POST /api/properties	PropertyForm.jsx	Create listing
PUT /api/properties/:id	PropertyForm.jsx	Edit listing
DELETE /api/properties/:id	PropertyDetail.jsx	Remove listing
GET /api/transactions	TransactionList.jsx (ADMIN)	View all deals
GET /api/transactions/my	TransactionList.jsx (BUYER/SELLER)	View own deals
GET /api/transactions/:id	TransactionDetail.jsx	Deal workspace
POST /api/transactions/initiate	PropertyDetail.jsx	Start a deal
POST /api/transactions/:id/deposit	TransactionDetail.jsx	Fund escrow
POST /api/transactions/:id/initiate-mutation	TransactionDetail.jsx	Start mutation
POST /api/transactions/:id/upload-document	TransactionDetail.jsx	Upload proof
POST /api/transactions/:id/complete-mutation	TransactionDetail.jsx	Confirm mutation
POST /api/transactions/:id/release	TransactionDetail.jsx	Release funds
POST /api/transactions/:id/refund	TransactionDetail.jsx	Refund buyer
Verification Plan
Automated Tests
npm run build — verify production build compiles without errors
Backend: node seed.js — verify admin seeding works
Manual Verification
Start backend (npm run dev in backend)
Start frontend (npm run dev in frontend)
Test complete flow:
Register as SELLER → create property listing
Register as BUYER → browse properties → initiate transaction → deposit funds
Login as SELLER → initiate mutation → upload document → complete mutation
Login as ADMIN (seeded) → release funds
Verify property status → SOLD, escrow balance → 0
Test refund flow separately
Test responsive design on mobile viewport
