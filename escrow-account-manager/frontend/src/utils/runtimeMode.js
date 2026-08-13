/** True when sandbox admin shortcuts (simulate MoMo/Irembo) are enabled in the build. */
export const demoToolsEnabled = () => import.meta.env.VITE_ENABLE_DEMO_TOOLS === 'true';

/** Production-style release checklist — all items required before admin release. */
export const releaseChecklistComplete = (transaction, validationReport) => {
  if (!transaction) return false;
  const docs = transaction.mutationDocuments || [];
  const report = validationReport || transaction.registryValidationReport;
  const registryOk = Boolean(
    report
    && report.registryRecordFound === 'VERIFIED'
    && report.upiFormatMatch === 'VERIFIED'
  );
  return (
    docs.length > 0
    && registryOk
    && Boolean(transaction.buyerConfirmedPropertyReceivedAt)
    && Boolean(transaction.escrowAccount && parseFloat(transaction.escrowAccount.balance || 0) > 0)
  );
};
