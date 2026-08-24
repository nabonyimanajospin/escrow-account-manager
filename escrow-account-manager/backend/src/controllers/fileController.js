const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { Transaction, Property, Dispute, DisputeEvidence } = require('../models');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const SENSITIVE_CATEGORIES = new Set(['kyc', 'mutations', 'evidence', 'contracts']);

/** Rebuild completion PDFs on download so old schedule-only files pick up the latest Articles template. */
const regenerateContractIfNeeded = async (filename) => {
  const { generateEscrowContract } = require('../services/contractService');
  const { transactionIncludes } = require('../utils/transactionHelpers');

  const suffix = `/uploads/contracts/${filename}`;
  let tx = await Transaction.findOne({
    where: { contractDocumentUrl: suffix },
    include: transactionIncludes,
  });

  if (!tx) {
    const txIdMatch = filename.match(/(TXN-[A-Z0-9-]+)/i);
    if (txIdMatch) {
      tx = await Transaction.findOne({
        where: { transactionId: txIdMatch[1].toUpperCase() },
        include: transactionIncludes,
      });
    }
  }

  if (tx) {
    await generateEscrowContract(tx, filename);
  }
};

const canAccessFile = async (category, req) => {
  if (!SENSITIVE_CATEGORIES.has(category)) {
    return true;
  }

  if (req.user.role === 'ADMIN') {
    return true;
  }

  if (category === 'kyc') {
    const expectedSuffix = `/uploads/kyc/${req.params.filename}`;
    return req.user.kycDocumentUrl === expectedSuffix;
  }

  if (category === 'mutations' || category === 'contracts') {
    const suffix = `/uploads/${category}/${req.params.filename}`;
    const transactions = await Transaction.findAll({
      where: {
        [Op.or]: [{ buyerId: req.user.id }, { sellerId: req.user.id }],
      },
      attributes: ['id', 'buyerId', 'sellerId', 'mutationDocuments', 'contractDocumentUrl'],
    });

    return transactions.some((tx) => {
      if (category === 'contracts' && tx.contractDocumentUrl === suffix) return true;
      const docs = tx.mutationDocuments || [];
      return category === 'mutations' && docs.some((d) => d.documentUrl === suffix);
    });
  }

  if (category === 'evidence') {
    const suffix = `/uploads/evidence/${req.params.filename}`;
    const evidence = await DisputeEvidence.findOne({ where: { fileUrl: suffix } });
    if (!evidence) return false;
    const dispute = await Dispute.findByPk(evidence.disputeId);
    if (!dispute) return false;
    const tx = await Transaction.findByPk(dispute.transactionId);
    if (!tx) return false;
    return tx.buyerId === req.user.id || tx.sellerId === req.user.id;
  }

  return false;
};

exports.serveFile = async (req, res, next) => {
  try {
    const { category, filename } = req.params;

    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, message: 'Invalid filename' });
    }

    const allowed = await canAccessFile(category, req);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this file' });
    }

    const filePath = path.join(UPLOAD_ROOT, category, filename);

    if (category === 'contracts') {
      try {
        await regenerateContractIfNeeded(filename);
      } catch (err) {
        // Fall through and serve any existing file if regeneration fails
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

exports.servePropertyImage = (req, res) => {
  const { filename } = req.params;
  if (!filename || filename.includes('..')) {
    return res.status(400).json({ success: false, message: 'Invalid filename' });
  }
  const filePath = path.join(UPLOAD_ROOT, 'properties', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }
  return res.sendFile(filePath);
};
