# EscrowTrust — Public Demo Prototype

**Shareable interactive prototype** for applications and reviewers.

> **Not** the full production system. Mock data only. No API keys. No backend.

## Why this demo is stronger

Reviewers can complete a **full escrow story** in one browser tab by switching roles:

1. **Buyer** — Buy now / offer → dual OTP (`123456`) → fund escrow  
2. **Seller** — OTP → simulate Irembo mutation upload → submit review  
3. **Admin** — audit checklist → **release** or **refund**  
4. See **activity journal**, **contract + QR**, **Ask AI on clauses**, **wallet funding request**

## Feature map

| Feature | Demo |
|---------|------|
| Landing + brand | Yes |
| Listings + role-aware prices | Yes |
| Buy now / bargain offer | Yes |
| Escrow workspace + timeline | Yes |
| Dual OTP consensus | Yes (`123456`) |
| Fund escrow (wallet → custody) | Yes |
| Mutation / Irembo upload sim | Yes |
| Admin audit + release/refund | Yes |
| Double-entry style journal | Yes |
| Contract preview + QR verify | Yes |
| Ask AI on clauses | Yes |
| AI chat Co-Pilot | Yes (scripted) |
| Wallet add-funds request | Yes (pending mock) |

## Run

```bash
cd demo
npm install
npm run dev
```

Open **http://localhost:5173**

## Suggested 5-minute walkthrough

1. Demo login → **Buyer**  
2. Open a listing → **Buy now & start escrow**  
3. Enter OTP **123456**  
4. Demo login → **Seller** → open same deal from Dashboard → OTP **123456**  
5. Demo login → **Buyer** → **Confirm escrow deposit**  
6. **Seller** → Simulate Irembo upload → Submit for review  
7. **Admin** → Approve & release  
8. Open contract preview (seal shows COMPLETED) + try Ask AI  

## Fees (same model as main product)

- Buyer: listing **+ 1%**  
- Seller: listing **− 1.5%**  
- Platform: **2.5%** total  

## Safe to share

- Push **only** this `demo` folder to a public repo  
- Do **not** share the private full `escrow-account-manager` `.env`  

## Author

**Jospin Nabonyimana** — EscrowTrust demo prototype
