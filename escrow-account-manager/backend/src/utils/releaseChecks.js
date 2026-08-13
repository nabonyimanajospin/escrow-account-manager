const registryVerified = (report) =>
  Boolean(
    report
    && report.registryRecordFound === 'VERIFIED'
    && report.upiFormatMatch === 'VERIFIED'
  );

const releasePrerequisitesMet = (transaction) => {
  const docs = transaction.mutationDocuments || [];
  const report = transaction.registryValidationReport;

  return {
    hasMutationDocuments: docs.length > 0,
    registryVerified: registryVerified(report),
    buyerConfirmedReceipt: Boolean(transaction.buyerConfirmedPropertyReceivedAt),
    escrowFunded: Boolean(
      transaction.escrowAccount
      && parseFloat(transaction.escrowAccount.balance || 0) > 0
    ),
  };
};

const canReleaseFunds = (transaction) => {
  const checks = releasePrerequisitesMet(transaction);
  return Object.values(checks).every(Boolean);
};

module.exports = {
  registryVerified,
  releasePrerequisitesMet,
  canReleaseFunds,
};
