/**
 * Stable contract checksum for QR verification links.
 * Must stay consistent across modal opens — never use Date.now() here.
 */
export const getStableContractChecksum = (transaction) => {
  const deedChecksum = transaction?.mutationDocuments?.[0]?.sha256Checksum;
  if (deedChecksum) return deedChecksum;

  const id = transaction?.id;
  const txRef = transaction?.transactionId || (id ? `TXN-${id}` : 'UNKNOWN');
  const suffix = txRef.split('-').pop()?.toUpperCase() || String(id || '0');
  return `CHK-ESCROW-${id}-${suffix}`;
};

export const isContractFinalized = (status) => status === 'COMPLETED';
