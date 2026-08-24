export const DEMO_PROPERTIES = [
  {
    id: 1,
    title: 'Kiyovu Modern Villa',
    location: 'Kiyovu, Kigali, Rwanda',
    propertyType: 'House',
    price: 350000,
    bedrooms: 4,
    bathrooms: 3,
    area: 450,
    status: 'AVAILABLE',
    image:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
    description:
      'A modern villa with strong street presence. Ideal demo listing for EscrowTrust escrow protection.',
    upiCode: '1/02/03/04/1234/5678',
    sellerId: 'seller-demo',
  },
  {
    id: 2,
    title: 'Gahanga Premium Land Plot',
    location: 'Gahanga, Kicukiro',
    propertyType: 'Land',
    price: 280000,
    bedrooms: 0,
    bathrooms: 0,
    area: 1200,
    status: 'AVAILABLE',
    image:
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200',
    description:
      'Premium land plot used in the demo to show UPI codes, fees, and contract preview.',
    upiCode: '1/03/01/04/3000',
    sellerId: 'seller-demo',
  },
  {
    id: 3,
    title: 'Nyarutarama Family Home',
    location: 'Nyarutarama, Gasabo',
    propertyType: 'House',
    price: 420000,
    bedrooms: 5,
    bathrooms: 4,
    area: 520,
    status: 'AVAILABLE',
    image:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
    description:
      'Spacious family home demonstrating buyer deposit totals vs seller net payout.',
    upiCode: '1/04/02/05/7788',
    sellerId: 'seller-demo',
  },
];

export const DEMO_USERS = {
  BUYER: { id: 'buyer-demo', name: 'Demo Buyer', role: 'BUYER', wallet: 720000 },
  SELLER: { id: 'seller-demo', name: 'Demo Seller', role: 'SELLER', wallet: 15000 },
  ADMIN: { id: 'admin-demo', name: 'Demo Admin', role: 'ADMIN', wallet: 0 },
};

export function getAiReply(message) {
  const q = (message || '').toLowerCase();
  if (/name|who are you/.test(q)) {
    return "I'm the **EscrowTrust AI Co-Pilot** (demo). I explain buying, fees, contracts, and escrow steps. I am software — not a human.";
  }
  if (/human|bot|robot/.test(q)) {
    return "No — I'm **not human**. I'm a demo AI assistant built into EscrowTrust to guide property escrow.";
  }
  if (/fee|cost|percent|charge/.test(q)) {
    return "### Platform fees\n- **Buyer:** +1.0% when funding escrow\n- **Seller:** −1.5% from payout on completion\n- **Total:** 2.5% service fee\n\n*No hidden costs in this model.*";
  }
  if (/contract|agreement|qr|pdf/.test(q)) {
    return "### How contracts work (demo)\n1. Deal starts → escrow contract reference is created\n2. **Contract Preview** shows clauses with live deal data\n3. QR / checksum links to a public verify page\n4. Final PDF certificate is issued when the deal is **COMPLETED**\n\nOpen any listing → **View contract preview**.";
  }
  if (/escrow|how it works|process|buy|otp|deal/.test(q)) {
    return "### Guided demo flow\n1. **Buyer:** listing → Buy now → OTP `123456`\n2. **Seller:** switch login → OTP `123456`\n3. **Buyer:** Confirm escrow deposit\n4. **Seller:** Simulate Irembo upload → submit review\n5. **Admin:** Approve & release (or refund)\n\nOpen **Dashboard** to see your deals.";
  }
  if (/admin|audit|release|refund/.test(q)) {
    return "### Admin (demo)\nWhen a deal is **UNDER_REVIEW**, open **Admin** or the deal page to see the checklist, then **Approve & release** or **Reject & refund**. Fees: buyer 1% + seller 1.5%.";
  }
  return "I can help with **fees**, **contracts**, **OTP/escrow steps**, and **admin release**. Try: *How does the demo deal flow work?*";
}
