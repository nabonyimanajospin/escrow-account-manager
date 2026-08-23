# EscrowTrust — Presentation Notes

This file is documentation only. It does not change application behavior.

## Elevator pitch

EscrowTrust is a digital escrow platform for real estate: lock buyer funds, verify ownership mutation documents, and release payment after admin review — with OTP consensus and a full audit trail.

## Demo flow (happy path)

1. Browse available property listings
2. Start / accept a deal (PENDING)
3. Buyer and seller verify shared OTP from notifications
4. Buyer deposits funds into escrow (FUNDED)
5. Seller starts mutation, uploads deeds, submits for review
6. Admin verifies and releases funds (or refunds if needed)
7. Deal completes with stamped agreement and ledger history

## Roles

- **Buyer** — funds escrow from wallet
- **Seller** — prepares mutation documents
- **Admin** — reviews, releases, or refunds

## Notes for presenters

- OTP codes appear in the notification bell (and email/SMS when configured)
- Dual authorization is required before deposit
- Seller OTP is required before starting mutation and before submit for review
