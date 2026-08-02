# 📘 Master Project Documentation: EscrowTrust Platform

> **Single Source of Truth**: This document contains the complete technical specification, architectural blueprint, developer guide, and future upgrade roadmap for the **EscrowTrust** Real Estate Escrow & Automated Legal Deed System for Rwanda.

---

## 📄 1. Project Identification & Authorship

* **Project Name**: EscrowTrust (Real Estate Escrow & Automated Deed Management System)
* **Lead Architect & Developer**: **Jospin Nabonyimana**
* **Contact Email**: `jospinnabonyimana@gmail.com`
* **GitHub Repository**: [nabonyimanajospin/escrow-account-manager](https://github.com/nabonyimanajospin/escrow-account-manager)
* **Target Jurisdiction**: Republic of Rwanda (Land Management & e-Governance Ecosystem)
* **Document Version**: 2.0.0 (Enterprise Release)

---

## 🎯 2. Executive Summary & Problem Statement

Real estate transactions in Rwanda face three primary challenges:
1. **Financial Fraud Risk**: Buyers fear transferring high-value funds directly to sellers before land title transfers are legally confirmed.
2. **Deed Fabrication & Tampering**: Fraudulent or photo-edited land title deeds submitted to deceive transacting parties.
3. **Administrative Delays**: Slow manual validation processes that create human bottlenecks in real estate closings.

### The Solution: EscrowTrust
EscrowTrust resolves these challenges by combining:
- 🧱 **EVM Smart Contracts**: Money is locked in a self-executing smart contract vault (`EscrowVault.sol`) and released ONLY when pre-agreed conditions are satisfied.
- 🔒 **SHA-256 Deed Fingerprinting**: Every uploaded document generates an immutable cryptographic checksum recorded on-chain.
- 🚦 **Automated Triage Pipeline**: Parallel AI scanner evaluates documents in real-time into **Green (Fast Track)**, **Yellow (Self-Correction Prompt)**, or **Red (Fraud Alert & Lock)** categories.
- 🔌 **Institutional Integration Sockets**: Pre-configured webhooks for **Irembo (Irembo.gov.rw)**, **RLMA Land Registry**, **RDB KYC**, and **MTN Mobile Money**.

---

## 📐 3. System Architecture & Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                ESCROWTRUST SYSTEM ARCHITECTURE                              │
├──────────────────────────────┬──────────────────────────────┬───────────────────────────────┤
│    REALTOR MARKETPLACE       │    EVM ESCROW SMART VAULT    │     INSTITUTIONAL SOCKETS     │
│                              │                              │                               │
│ • Property Catalog & Search  │ • OpenZeppelin EscrowVault   │ • Irembo (Irembo.gov.rw)      │
│ • Fixed Price & Bidding      │ • SHA-256 Deed Checksums    │ • RLMA (Land Registry)        │
│ • AI Buyer Ranking Engine    │ • Dual OTP Consensus Keys    │ • RDB (KYC Verification)      │
│ • Seller Control Portal      │ • Automated Triage Pipeline  │ • MTN MoMo / Bank Webhooks    │
└──────────────────────────────┴──────────────────────────────┴───────────────────────────────┘
```

---

## 🛠️ 4. Technology Stack

### Backend Infrastructure
* **Runtime & Framework**: Node.js v18+, Express.js
* **Database & ORM**: PostgreSQL, Sequelize ORM (Double-entry transaction logging)
* **Blockchain Engine**: Solidity 0.8.20, Ethers.js v6, Hardhat EVM toolchain (Chain ID 1337)
* **AI & Document Processing**: Tesseract OCR, PDF-Parse, Gemini AI Integration
* **Security & Auth**: JWT (JSON Web Tokens), bcryptjs, Helmet, HPP, Express Rate Limit
* **Logging & Testing**: Winston Logger, Jest Test Suite (55/55 Passing Tests)

### Frontend Infrastructure
* **Framework & Build**: React 18, Vite build tool
* **Styling**: TailwindCSS v4 with custom corporate design tokens
* **Routing & State**: React Router v6, Context API
* **UI Components & Icons**: Lucide Icons, React Hot Toast

### DevOps & Environment
* **Containerization**: Docker, Docker Compose
* **Web Server**: Nginx
* **Environment Files**: `backend/.env`, `frontend/.env`

---

## ⚙️ 5. Detailed Module Specifications

### Module A: EVM Escrow Smart Contract (`EscrowVault.sol`)
- **Location**: [backend/contracts/EscrowVault.sol](file:///c:/Users/FH%20Technology%20Ltd/Desktop/Escrow%20Management%20System/escrow-account-manager/backend/contracts/EscrowVault.sol)
- **Artifact**: [backend/artifacts/EscrowVault.json](file:///c:/Users/FH%20Technology%20Ltd/Desktop/Escrow%20Management%20System/escrow-account-manager/backend/artifacts/EscrowVault.json)
- **Service Adapter**: [backend/src/services/blockchainProvider.js](file:///c:/Users/FH%20Technology%20Ltd/Desktop/Escrow%20Management%20System/escrow-account-manager/backend/src/services/blockchainProvider.js)
- **Functionality**:
  1. Deploys an isolated EVM escrow contract per real estate deal.
  2. Implements state machine locks (`INITIATED`, `FUNDED`, `MUTATION_STARTED`, `UNDER_REVIEW`, `COMPLETED`, `REFUNDED`, `DISPUTED`).
  3. Enforces dual OTP consensus signatures before releasing or refunding funds.
  4. Stores cryptographic SHA-256 document checksums directly in smart contract state logs.

### Module B: Parallel AI Document Authenticity Scanner & Triage Pipeline
- **Location**: [backend/src/services/documentAnalysisService.js](file:///c:/Users/FH%20Technology%20Ltd/Desktop/Escrow%20Management%20System/escrow-account-manager/backend/src/services/documentAnalysisService.js)
- **Functionality**:
  - Scans uploaded deed files instantly using OCR vision and rules engines **in parallel to Irembo government webhooks**.
  - Checks document headers ("Titre Foncier", "RLMUA"), extracts Land Parcel UPI (`1/03/08/02/1234`), cross-checks legal seller names, and scans for Photoshop/watermark fraud.
- **Triage Action Pipeline**:
  - **🟢 GREEN (Fast Track)**: Score >= 85%, zero flags, UPI match -> Auto-advances transaction to `UNDER_REVIEW`.
  - **🟡 YELLOW (Self-Correction Prompt)**: Minor typo -> Prompts seller to fix & re-upload before proceeding.
  - **🔴 RED (Fraud Alert & Lock)**: Photoshop edits/sample watermarks -> Freezes transaction status to `DISPUTED`, logs fraud alert on-chain, and alerts Admin for dispute mediation.

### Module C: Institutional Integration Sockets
- **Location**: [backend/src/routes/integrations.js](file:///c:/Users/FH%20Technology%20Ltd/Desktop/Escrow%20Management%20System/escrow-account-manager/backend/src/routes/integrations.js) & [backend/src/services/institutionalSockets.js](file:///c:/Users/FH%20Technology%20Ltd/Desktop/Escrow%20Management%20System/escrow-account-manager/backend/src/services/institutionalSockets.js)
- **Endpoints**:
  - `POST /api/integrations/irembo/mutation-webhook`: Receives official land transfer approvals from `Irembo.gov.rw`.
  - `POST /api/integrations/rdb/kyc-verify`: Verifies national ID / company registration numbers against RDB.
  - `POST /api/integrations/momo/payment-webhook`: Receives automated Mobile Money & bank settlement callbacks.
  - `GET /api/integrations/status`: Institutional connection health monitoring gateway.

### Module D: AI Buyer Ranking & Recommendation System
- **Location**: [backend/src/controllers/offerController.js](file:///c:/Users/FH%20Technology%20Ltd/Desktop/Escrow%20Management%20System/escrow-account-manager/backend/src/controllers/offerController.js)
- **Scoring Algorithm**: `Score = ((OfferPrice / TargetPrice) * 100) - (PaymentPeriodDays * 0.5) + (KYC Verified Bonus ? 5 : 0)`
- **Functionality**: Ranks all incoming property bids and displays **🏆 Rank #1 Top Pick** recommendations on seller property views.

---

## 🏃 6. Developer Setup & Execution Guide

### Local Development Setup

```bash
# 1. Start Backend API (http://localhost:5000)
cd backend
npm install
npm run dev

# 2. Start Frontend Application (http://localhost:3000)
cd ../frontend
npm install
npm run dev
```

### Docker Compose Production Startup

```bash
# Launch PostgreSQL, Backend, and Frontend containers
docker-compose up -d --build
```

### Running Automated Test Suite

```bash
cd backend
npm test
```

**Verification Output**: **55 / 55 Passed (100%)** across 4 test suites (`auth.test.js`, `properties.test.js`, `transactions.test.js`, `upgrades.test.js`).

---

## 🔑 7. Pre-Seeded Demo Login Credentials

| Role | Email | Password | Primary Workflow |
| :--- | :--- | :--- | :--- |
| **BUYER** | `buyer@escrowtrust.com` | `Buyer@123` | Browse catalog, submit bids, fund smart contract escrow. |
| **SELLER** | `seller@escrowtrust.com` | `Seller@123` | List properties, view AI buyer rankings, upload title deeds. |
| **ADMIN** | `admin@escrowtrust.com` | `Admin@123` | System oversight, audit logs, dispute arbitration, payout release. |

---

## 🚀 8. Phase 2 & 3 National Rollout Upgrade Roadmap

When scaling the platform for national deployment in Rwanda:

1. **Direct Live Irembo 2.0 API**: Transition from webhook sockets to live bi-directional API streaming with `Irembo.gov.rw`.
2. **ISO 20022 Regulated Banking Gateway**: Connect escrow fund movements directly to Central Bank of Rwanda (BNR) regulated commercial bank accounts via ISO 20022 APIs.
3. **National Hyperledger Besu Blockchain**: Migrate local EVM contracts to Rwanda's national consortium blockchain network.
4. **Kinyarwanda USSD `*182#` Access Menu**: Feature phone menu for rural landowners to check balances and approve title transfers.
5. **GIS Master Plan Overlay**: Interactive map layer displaying parcel boundaries and zoning rules.
6. **Multilingual AI OCR**: Fine-tuned OCR for handwritten historical land certificates in Kinyarwanda, French, and English.
