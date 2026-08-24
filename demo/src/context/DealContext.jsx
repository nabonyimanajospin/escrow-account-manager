import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEMO_PROPERTIES } from '../data/demoData';
import { calculatePlatformFees } from '../utils/fees';

const DealContext = createContext(null);
const STORAGE_KEY = 'escrowtrust-demo-deals-v1';

const STEPS = [
  'PENDING',
  'OTP_DONE',
  'FUNDED',
  'MUTATION_UPLOADED',
  'UNDER_REVIEW',
  'COMPLETED',
];

function loadDeals() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function DealProvider({ children }) {
  const [deals, setDeals] = useState(loadDeals);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
  }, [deals]);

  const startDeal = useCallback((propertyId, opts = {}) => {
    const property = DEMO_PROPERTIES.find((p) => p.id === propertyId);
    if (!property) return null;
    const fees = calculatePlatformFees(opts.offerPrice || property.price);
    const id = `DEMO-${Date.now().toString(36).toUpperCase()}`;
    const deal = {
      id,
      propertyId: property.id,
      propertyTitle: property.title,
      location: property.location,
      upiCode: property.upiCode,
      image: property.image,
      amount: fees.price,
      buyerFee: fees.buyerFee,
      sellerFee: fees.sellerFee,
      buyerTotal: fees.buyerTotal,
      sellerNet: fees.sellerNetPayout,
      status: 'PENDING',
      buyerOtpOk: false,
      sellerOtpOk: false,
      mutationDoc: null,
      adminNotes: '',
      journal: [
        {
          id: 1,
          type: 'INFO',
          text: 'Escrow deal created — awaiting dual OTP consensus',
          at: new Date().toISOString(),
        },
      ],
      bidNote: opts.bidNote || null,
      createdAt: new Date().toISOString(),
    };
    setDeals((d) => [deal, ...d]);
    return deal;
  }, []);

  const patchDeal = useCallback((dealId, updater) => {
    setDeals((list) =>
      list.map((d) => {
        if (d.id !== dealId) return d;
        const next = typeof updater === 'function' ? updater(d) : { ...d, ...updater };
        return next;
      })
    );
  }, []);

  const addJournal = useCallback((dealId, text, type = 'INFO') => {
    patchDeal(dealId, (d) => ({
      ...d,
      journal: [
        ...d.journal,
        { id: d.journal.length + 1, type, text, at: new Date().toISOString() },
      ],
    }));
  }, [patchDeal]);

  const confirmOtp = useCallback((dealId, role) => {
    patchDeal(dealId, (d) => {
      const buyerOtpOk = role === 'BUYER' ? true : d.buyerOtpOk;
      const sellerOtpOk = role === 'SELLER' ? true : d.sellerOtpOk;
      const both = buyerOtpOk && sellerOtpOk;
      return {
        ...d,
        buyerOtpOk,
        sellerOtpOk,
        status: both ? 'OTP_DONE' : d.status,
        journal: [
          ...d.journal,
          {
            id: d.journal.length + 1,
            type: 'OTP',
            text: `${role} verified OTP consensus code`,
            at: new Date().toISOString(),
          },
          ...(both
            ? [
                {
                  id: d.journal.length + 2,
                  type: 'INFO',
                  text: 'Dual OTP complete — buyer may fund escrow',
                  at: new Date().toISOString(),
                },
              ]
            : []),
        ],
      };
    });
  }, [patchDeal]);

  const fundEscrow = useCallback((dealId) => {
    patchDeal(dealId, (d) => ({
      ...d,
      status: 'FUNDED',
      journal: [
        ...d.journal,
        {
          id: d.journal.length + 1,
          type: 'DEBIT',
          text: `Buyer wallet −$${Number(d.buyerTotal).toLocaleString()} → ESCROW_CUSTODY`,
          at: new Date().toISOString(),
        },
        {
          id: d.journal.length + 2,
          type: 'CREDIT',
          text: `ESCROW_CUSTODY +$${Number(d.buyerTotal).toLocaleString()} (price + 1% fee)`,
          at: new Date().toISOString(),
        },
      ],
    }));
  }, [patchDeal]);

  const uploadMutation = useCallback((dealId, fileName) => {
    patchDeal(dealId, (d) => ({
      ...d,
      status: 'MUTATION_UPLOADED',
      mutationDoc: {
        name: fileName || 'Irembo-Mutation-Certificate-DEMO.pdf',
        url: 'https://irembo.gov.rw/demo-certificate',
        at: new Date().toISOString(),
      },
      journal: [
        ...d.journal,
        {
          id: d.journal.length + 1,
          type: 'DOC',
          text: `Seller uploaded mutation proof: ${fileName || 'Irembo certificate (simulated)'}`,
          at: new Date().toISOString(),
        },
      ],
    }));
  }, [patchDeal]);

  const submitForReview = useCallback((dealId) => {
    patchDeal(dealId, (d) => ({
      ...d,
      status: 'UNDER_REVIEW',
      journal: [
        ...d.journal,
        {
          id: d.journal.length + 1,
          type: 'INFO',
          text: 'Deal submitted to admin audit console',
          at: new Date().toISOString(),
        },
      ],
    }));
  }, [patchDeal]);

  const releaseFunds = useCallback((dealId, notes) => {
    patchDeal(dealId, (d) => ({
      ...d,
      status: 'COMPLETED',
      adminNotes: notes || 'Demo release approved',
      journal: [
        ...d.journal,
        {
          id: d.journal.length + 1,
          type: 'CREDIT',
          text: `Seller wallet +$${Number(d.sellerNet).toLocaleString()} (net after 1.5%)`,
          at: new Date().toISOString(),
        },
        {
          id: d.journal.length + 2,
          type: 'CREDIT',
          text: `PLATFORM_REVENUE +$${Number(d.buyerFee + d.sellerFee).toLocaleString()} (2.5% total fees)`,
          at: new Date().toISOString(),
        },
        {
          id: d.journal.length + 3,
          type: 'INFO',
          text: 'Admin released escrow — deal COMPLETED · certificate ready',
          at: new Date().toISOString(),
        },
      ],
    }));
  }, [patchDeal]);

  const refundBuyer = useCallback((dealId, notes) => {
    patchDeal(dealId, (d) => ({
      ...d,
      status: 'REFUNDED',
      adminNotes: notes || 'Demo refund',
      journal: [
        ...d.journal,
        {
          id: d.journal.length + 1,
          type: 'CREDIT',
          text: `Buyer refund +$${Number(d.buyerTotal).toLocaleString()} from escrow`,
          at: new Date().toISOString(),
        },
        {
          id: d.journal.length + 2,
          type: 'INFO',
          text: 'Admin refunded buyer — deal closed',
          at: new Date().toISOString(),
        },
      ],
    }));
  }, [patchDeal]);

  const resetDemo = useCallback(() => {
    setDeals([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      deals,
      STEPS,
      startDeal,
      confirmOtp,
      fundEscrow,
      uploadMutation,
      submitForReview,
      releaseFunds,
      refundBuyer,
      resetDemo,
      getDeal: (id) => deals.find((d) => d.id === id),
    }),
    [
      deals,
      startDeal,
      confirmOtp,
      fundEscrow,
      uploadMutation,
      submitForReview,
      releaseFunds,
      refundBuyer,
      resetDemo,
    ]
  );

  return <DealContext.Provider value={value}>{children}</DealContext.Provider>;
}

export function useDeals() {
  return useContext(DealContext);
}
