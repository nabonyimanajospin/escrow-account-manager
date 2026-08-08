# 🛡️ EscrowTrust — Real Estate Escrow & Automated Legal Deed System

> **Product Vision**: A modern, secure, and automated real estate escrow vault and title deed management platform designed for the Rwandan real estate ecosystem. Integrates **EVM Smart Contracts**, **Parallel AI Document Authenticity Scanning**, **Dual OTP Cryptographic Consensus**, and **Institutional Integration Sockets** (Irembo, RLMA, RDB, MTN MoMo).

---

## 👤 Project Author & Lead Developer

* **Lead Architect & Developer**: **Jospin Nabonyimana**
* **GitHub Repository**: [nabonyimanajospin/escrow-account-manager](https://github.com/nabonyimanajospin/escrow-account-manager)
* **Contact Email**: `jospinnabonyimana@gmail.com`
* **Target Jurisdiction**: Republic of Rwanda (Land Management & e-Governance Ecosystem)

---

## 🚀 System Architecture & Key Features

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                ESCROWTRUST SYSTEM PLATFORM                                  │
├──────────────────────────────┬──────────────────────────────┬───────────────────────────────┤
│    REALTOR MARKETPLACE       │    EVM ESCROW SMART VAULT    │     INSTITUTIONAL SOCKETS     │
│                              │                              │                               │
│ • Property Catalog & Search  │ • OpenZeppelin EscrowVault   │ • Irembo (Irembo.gov.rw)      │
│ • Fixed Price & Bidding      │ • SHA-256 Deed Checksums    │ • RLMA (Land Registry)        │
│ • AI Buyer Ranking Engine    │ • Dual OTP Consensus Keys    │ • RDB (KYC Verification)      │
│ • Seller Control Portal      │ • Automated Triage Pipeline  │ • MTN MoMo / Bank Webhooks    │
└──────────────────────────────┴──────────────────────────────┴───────────────────────────────┘
```

### 1. 🧱 EVM Smart Contract Escrow Vault (`EscrowVault.sol`)
* **Solidity Version**: `0.8.20`
* **Contract Code**: [backend/contracts/EscrowVault.sol](file:///c:/Users/FH%20Technology%20Ltd/Desktop/Escrow%20Management%20System/escrow-account-manager/backend/contracts/EscrowVault.sol)
* **Compiled JSON Artifact**: [backend/artifacts/EscrowVault.json](file:///c:/Users/FH%20Technology%20Ltd/Desktop/Escrow%20Management%20System/escrow-account-manager/backend/artifacts/EscrowVault.json)
* **Capabilities**: State machine locks (`INITIATED`, `FUNDED`, `MUTATION_STARTED`, `UNDER_REVIEW`, `COMPLETED`, `REFUNDED`, `DISPUTED`), dual OTP consensus, and reentrancy protection.

### 2. 🚦 Automated Triage Pipeline & Parallel AI Scanner
* **AI Engine**: OCR + NLP vision rules engine ([backend/src/services/documentAnalysisService.js](file:///c:/Users/FH%20Technology%20Ltd/Desktop/Escrow%20Management%20System/escrow-account-manager/backend/src/services/documentAnalysisService.js))
* **Triage Categories**:
  - **🟢 GREEN (Fast Track)**: Document passes AI verification with 0 flags -> Automatically advances transaction to `UNDER_REVIEW`.
  - **🟡 YELLOW (Self-Correction Prompt)**: Minor typo in seller name or UPI -> Prompts seller to fix & re-upload before proceeding.
  - **🔴 RED (Fraud Alert & Escrow Lock)**: Photoshop edits or sample watermarks -> Automatically freezes transaction to `DISPUTED`, logs fraud alert on-chain, and alerts Admin for dispute mediation.

### 3. 🔌 Institutional Integration Sockets
* **Irembo / RLMA Webhook**: `POST /api/integrations/irembo/mutation-webhook`
* **RDB KYC Verification Socket**: `POST /api/integrations/rdb/kyc-verify`
* **MTN MoMo / Bank Callback**: `POST /api/integrations/momo/payment-webhook`
* **Institutional Health Gateway**: `GET /api/integrations/status`

### 4. 🤖 AI Buyer Ranking & Recommendation System
* Multi-factor bid scoring formula: `Score = ((OfferPrice / TargetPrice) * 100) - (PaymentPeriodDays * 0.5) + (KYC Verified Bonus ? 5 : 0)`.
* Displays **🏆 Rank #1 Top Pick** recommendations for sellers on property detail pages.

### 5. 🛒 Preserving Buyer Purchase Intent
* Remembers target property page when an unauthenticated user signs in, returning them directly to complete their purchase.

### 6. 🔒 Automatic Property Listing Hiding on Active Bids
* When a buyer places a bid or starts an escrow on a property, that listing is automatically hidden from other buyers browsing the public catalog.

### 7. 📊 Auditable Double-Entry Accounting Journal
* Deal-level and platform-wide double-entry bookkeeping journal tracking `DEBIT` (-) and `CREDIT` (+) balance shifts across `BUYER_CASH`, `ESCROW_CUSTODY`, `SELLER_CASH`, and `PLATFORM_REVENUE`.

### 8. 🧠 Interactive AI Contract Interpretation ("Highlight & Ask AI")
* Users can highlight/select ANY paragraph or clause in the contract to trigger a floating `✨ Ask AI to Explain` button powered by Gemini AI.

### 9. 📜 Stamped Contract Preview with Scannable QR Code & Barcode
* Features an official glowing Rwanda Land Vault seal stamp, Code128 barcode, and real `qrcode.react` SVG QR code encoding live verification links.

### 10. 🔍 Public Contract Verification Certificate
* Scanning the contract's QR code opens a public certificate portal (`/verify-contract/:checksum`) with backend database verification against deed checksums and signatures.

---

## 🛠️ Technology Stack

### Backend Technologies
* **Runtime & Framework**: Node.js v18+, Express.js
* **Database & ORM**: PostgreSQL, Sequelize ORM
* **Blockchain & Web3**: Solidity 0.8.20, Ethers.js v6, Hardhat EVM toolchain
* **AI & Document Vision**: Tesseract OCR, PDF-Parse, Gemini AI Integration
* **Security & Authentication**: JWT (JSON Web Tokens), bcryptjs, Helmet, HPP, Express Rate Limit
* **Testing Suite**: Jest (55/55 Passing Tests)

### Frontend Technologies
* **Core Framework**: React 18 (Vite build tool)
* **Styling**: TailwindCSS v4 with custom corporate design tokens
* **Routing & State**: React Router v6, Context API
* **Icons & Notifications**: Lucide Icons, React Hot Toast

### DevOps & Deployment
* **Containerization**: Docker, Docker Compose
* **Web Server**: Nginx
* **Logging**: Winston Logger

---

## 🏃 Running the System

### Option A: Local Development Server

```bash
# 1. Start Backend API Server (Runs on http://localhost:5000)
cd backend
npm install
npm run dev

# 2. Start Frontend App (Runs on http://localhost:3000)
cd ../frontend
npm install
npm run dev
```

### Option B: Docker Compose

```bash
# Build and run complete stack in background
docker-compose up -d --build
```

---

## 🧪 Testing & Verification

Run the full backend test suite:

```bash
cd backend
npm test
```

**Current Test Status**: **55 / 55 Passed (100%)** across 4 test suites (`auth.test.js`, `properties.test.js`, `transactions.test.js`, `upgrades.test.js`).

---

## 🔑 Demo Access Credentials

| Role | Email | Password | Primary Workflow |
| :--- | :--- | :--- | :--- |
| **BUYER** | `buyer@escrowtrust.com` | `Buyer@123` | Browse properties, place bids, fund smart contract escrow. |
| **SELLER** | `seller@escrowtrust.com` | `Seller@123` | List properties, view AI buyer rankings, upload title deeds. |
| **ADMIN** | `admin@escrowtrust.com` | `Admin@123` | Government oversight, audit logs, dispute arbitration, payout release. |

---

## 🚀 Phase 2 & 3 National Rollout Upgrade Roadmap

1. **Irembo 2.0 Live Bi-Directional API**: Streaming land title approvals directly from `Irembo.gov.rw`.
2. **ISO 20022 Open Banking Gateway**: Connecting Central Bank (BNR) regulated commercial bank trustee accounts.
3. **National Hyperledger Besu Blockchain**: Migrating local EVM smart contracts to Rwanda's national consortium blockchain network.
4. **Multilingual AI Vision OCR**: Fine-tuning document OCR for handwritten historical land certificates in Kinyarwanda, French, and English.
5. **USSD `*182#` Access Menu**: Feature phone USSD menu for rural property owners to approve land transfers.
6. **GIS Master Plan Overlay**: Interactive map layer showing parcel boundaries and zoning regulations.

---

## 📄 Documentation Links

* **Master Implementation Plan**: [implementation_plan.md](file:///C:/Users/FH%20Technology%20Ltd/.gemini/antigravity-ide/brain/1a0cc903-34bd-47db-8447-4c38701e7d3d/implementation_plan.md)
* **Future Work & Detailed Specifications**: [future_work.md](file:///c:/Users/FH%20Technology%20Ltd/Desktop/Escrow%20Management%20System/escrow-account-manager/future_work.md)
* **Prioritized Improvements Tracker**: [prioritized_improvements.md](file:///c:/Users/FH%20Technology%20Ltd/Desktop/Escrow%20Management%20System/escrow-account-manager/prioritized_improvements.md)
