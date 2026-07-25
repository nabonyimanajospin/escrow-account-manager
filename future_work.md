# Project Roadmap & Future Work

This document outlines the refinements completed in the current sprint, followed by the technical roadmap required to transition this **Escrow Management System** prototype into a full-scale, enterprise-ready production platform.

---

## Completed Refinements (Current Build)

### 1. Active Deal Anti-Spam Safeguard (Item 5 - Part A)
*   **Status**: **COMPLETED**
*   **Details**: Implemented a security check in `/backend/src/controllers/transactionController.js`. It tracks a buyer's active transactions (`PENDING`, `FUNDED`, `MUTATION_STARTED`, `UNDER_REVIEW`). If a buyer attempts to click "Buy" on more than **2 properties simultaneously**, the backend blocks the operation.

### 2. Printable Deed of Sale & Receipt (New Feature)
*   **Status**: **COMPLETED**
*   **Details**: Once the deal status transitions to `COMPLETED` (Admin releases funds), the workspace (`EscrowDetail.jsx`) renders a formal, printable **Deed of Sale & Settlement Agreement**. The **Print Agreement Receipt** button opens a print-preview rendering only the legal document, hiding website menus and formatting it for standard paper/PDF download.

### 3. Live 10-Minute Lock Expiration Timer (Item 5 - Part B)
*   **Status**: **COMPLETED**
*   **Details**: Implemented automated deal timeout. If a transaction stays in `PENDING` for more than **10 minutes** without a deposit, the backend automatically cancels the transaction, unlocks the property back to the market, and hashes a system cancellation log into the ledger. The frontend workspace features a live ticking countdown clock showing the remaining minutes and seconds.

### 4. Non-Repudiated Ledger Logging & Live Activity Timeline (Pillars 2, 8, 9 & Principle 3)
*   **Status**: **COMPLETED**
*   **Details**: Integrated full IP and Browser/Device fingerprinting into all ledger signatures to ensure absolute non-repudiation. Additionally, designed and implemented a **Live Transaction Activity Feed** in the user's workspace, parsing complex block hashes into a beautiful chronological, human-readable timeline with custom styled status indicators.

---

## Future Roadmap (Next Sprints)

## 1. Offer Bidding & Bargaining Protocol
*   **Problem**: In the current system, clicking "Buy" automatically generates a transaction at the listing price and locks the property to `PENDING`. This does not support real-world bargaining or competitive bidding.
*   **Proposed Solution**: 
    1.  Allow multiple buyers to submit "Offers" (bids) with custom purchase amounts and terms on any `AVAILABLE` property listing.
    2.  Implement a **Seller Bidding Dashboard** where the seller can view all incoming offers, negotiate terms, and either reject them or select a winning bid.
    3.  Once the seller selects a bid, the property transitions to `PENDING`, all other bids are archived, and the secure escrow transaction is generated for that specific buyer and accepted price.

---

## 2. Autonomous Ownership Mutation via Government Registry API
*   **Problem**: Currently, an Admin must manually review uploaded mutation deed documents and click "Release" to settle funds. This relies on human trust and introduces administrative delays.
*   **Proposed Solution**: 
    1.  Integrate the platform with a mock or real **Land Portal API / Government Deeds Registry**.
    2.  When the seller initiates mutation, the system pings the land registry to track ownership changes.
    3.  Upon successful ownership transfer detection in the government registry, the API triggers the escrow release autonomous hook, transferring funds to the seller without requiring manual administrator approvals.

---

## 3. Enterprise Session Security (Secure httpOnly Cookies)
*   **Problem**: JWT session tokens are stored in the browser's `localStorage` for easy client access. However, `localStorage` is vulnerable to Cross-Site Scripting (XSS) token extraction.
*   **Proposed Solution**:
    1.  Configure the Express backend to send the JWT token inside a response header set as `httpOnly`, `Secure`, and `SameSite=Strict` cookie.
    2.  The browser automatically attaches the cookie to all subsequent API requests. Since JavaScript cannot read `httpOnly` cookies, the session tokens are fully protected from cross-site scripting attacks.

---

## 4. Decentralized Smart Contract Deployment (True Web3 Custody)
*   **Problem**: Escrow balances and contract addresses are simulated inside the relational PostgreSQL database via SHA-256 hash chains. No real blockchain networks are involved.
*   **Proposed Solution**:
    1.  Develop Solidity smart contracts to manage escrow locks on a Layer 2 Ethereum rollup (e.g. Arbitrum, Optimism) or Sepolia Testnet.
    2.  Connect the React frontend to **MetaMask** or **WalletConnect** via `ethers.js` or `viem`.
    3.  When a transaction is initiated, the buyer sends real stablecoins (e.g., USDC) to the contract address. The smart contract acts as the decentralized middleman, releasing funds only upon cryptographic signatures from the transacting parties or the arbiter.

---

## 5. Earnest Money Deposit (EMD) (Item 5 - Part B)
*   **Problem**: While the active deal limit prevents spamming, a buyer could still lock two listings without putting up initial capital.
*   **Proposed Solution**:
    1.  Implement an **Earnest Money Deposit (EMD)** requirement. To lock a property listing into `PENDING` status, the buyer must make an immediate, non-refundable deposit (e.g., 1% of the property value).
    2.  If the buyer fails to lock the full amount within 24 hours, the deal is auto-cancelled, and the deposit is forfeited to the seller.

---

## 6. Dispute Resolution Flow & Arbitrator Panel (The Dispute Engine)
*   **Problem**: If the seller uploads fraudulent document proofs, the funds sit locked in the system indefinitely without a way for the buyer to raise a dispute or freeze the deal.
*   **Proposed Solution**:
    1.  Add a **"File a Dispute"** action for the buyer in the workspace.
    2.  Transition transaction status to `DISPUTED`, put a legal hold lock on the escrow balance, and pause SLA timers.
    3.  Open an **Arbitrator Panel interface** where both parties can upload evidence logs, and an independent mediator can review and rule on the release or clawback refund.

---

## 7. Dynamic Platform Fee Chaining (Automated Fee Splits)
*   **Problem**: The system does not currently calculate or deduct a platform service fee (e.g., 1%-3%) before releasing escrow funds to the seller.
*   **Proposed Solution**:
    1.  Add a global platform fee configuration in the Admin console.
    2.  When the Admin releases funds, the backend automatically splits the escrow balance: routes the calculated platform commission to the platform's custody wallet and dispatches the remaining net amount to the seller.

---

## 8. Know Your Customer (KYC/KYB) Compliance Integration
*   **Problem**: Anyone can register and transact immediately. Anonymous escrow transactions invite high money-laundering risks.
*   **Proposed Solution**:
    1.  Integrate with a KYC verification provider (e.g., Sumsub, Onfido, or Government ID verification APIs).
    2.  Require buyers and sellers to verify their identities before publishing a listing or initiating a transaction.

---

## 9. Unilateral Timeout Protections & Automatic Clawbacks
*   **Problem**: If the seller goes silent or refuses to collaborate, the buyer's funds are trapped in the escrow contract indefinitely.
*   **Proposed Solution**:
    1.  Implement strict Service Level Agreement (SLA) timers on the mutation phases (e.g., 5-day upload window).
    2.  If the seller fails to perform within this timeframe, the buyer is granted a unilateral right to request a clawback refund without needing seller consensus signatures.

---

## 10. Double-Entry Accounting Ledger Schema
*   **Problem**: The database updates a single relational balance column on the `Escrows` table, which lacks standard financial audit trail verification.
*   **Proposed Solution**:
    1.  Design a double-entry ledger database schema (Credits & Debits).
    2.  Ensure every fund movement (deposits, fees, releases, refunds) creates balancing entries that sum to zero, creating a tamper-proof account ledger.

---

## 11. Production-Grade SLA Payment Clearing (Awaiting Clearing State)
*   **Problem**: High-value bank transfers and wires take hours or days to clear. Immediate deposit simulation is unrealistic for production bank clearings.
*   **Proposed Solution**:
    1.  Introduce an `AWAITING_CLEARING` transaction state.
    2.  When a payment is initiated, lock the deal until a bank API webhook confirms actual cash liquidity, preventing spoofed payments.


