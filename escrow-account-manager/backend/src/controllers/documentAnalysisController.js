/**
 * documentAnalysisController.js
 * 
 * Triggers AI document analysis on an uploaded mutation document or property deed.
 * Results are stored in Transaction.documentAnalysisReport (JSONB).
 */

const path = require('path');
const { Transaction, Property } = require('../models');
const { analyzeDocument } = require('../services/documentAnalysisService');

const UPLOAD_BASE = path.join(__dirname, '../../uploads');

// ── Helper: resolve absolute path from stored relative path ──────────────────
const resolveFilePath = (storedPath) => {
  // storedPath might be: "/uploads/mutation/filename.pdf" or a full path
  if (path.isAbsolute(storedPath)) return storedPath;
  // Strip leading slash and join with upload root
  const relative = storedPath.replace(/^\/uploads\//, '');
  return path.join(UPLOAD_BASE, relative);
};

/**
 * @desc    Trigger AI document analysis on the latest mutation document
 * @route   POST /api/escrow/:id/analyze-document
 * @access  Private (SELLER, ADMIN)
 */
exports.analyzeTransactionDocument = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [{ model: Property, as: 'property' }],
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Authorization: seller of this deal or admin
    const isSeller = transaction.sellerId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    if (!isSeller && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to analyze this transaction' });
    }

    // Get the document to analyze
    const docs = transaction.mutationDocuments || [];
    if (docs.length === 0) {
      return res.status(400).json({ success: false, message: 'No mutation documents uploaded yet. Upload a document first.' });
    }

    // Analyze the most recent document
    const latestDoc = docs[docs.length - 1];
    const docPath = resolveFilePath(latestDoc.documentUrl || latestDoc);
    const propertyType = transaction.property?.propertyType || 'LAND';
    const expectedUpi = transaction.property?.upiCode || '';

    // The seller's name (from req.user if seller, otherwise look up seller from transaction)
    const { User } = require('../models');
    const seller = await User.findByPk(transaction.sellerId, { attributes: ['name'] });
    const sellerName = seller?.name || '';

    // Run AI analysis (may take 5–30 seconds for OCR)
    const report = await analyzeDocument(docPath, propertyType, sellerName, expectedUpi);

    // Store the report on the transaction
    await transaction.update({ documentAnalysisReport: report });

    // Build a user-friendly response
    const verdictLabel = {
      LIKELY_VALID: '✅ Document appears valid',
      NEEDS_REVIEW: '⚠️ Admin review required',
      SUSPICIOUS: '🚨 Document flagged as suspicious',
    };

    return res.status(200).json({
      success: true,
      message: verdictLabel[report.verdict] || 'Analysis complete',
      analysis: {
        verdict: report.verdict,
        confidence: `${report.confidence}%`,
        status: report.status,
        flags: report.flags,
        findings: report.findings,
        crossChecks: report.crossChecks,
        processingTime: `${report.processingMs}ms`,
        model: report.model,
        timestamp: report.analysisTimestamp,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the stored document analysis report for a transaction
 * @route   GET /api/escrow/:id/document-analysis
 * @access  Private
 */
exports.getDocumentAnalysisReport = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const isParticipant =
      transaction.buyerId === req.user.id ||
      transaction.sellerId === req.user.id ||
      req.user.role === 'ADMIN';

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!transaction.documentAnalysisReport) {
      return res.status(404).json({
        success: false,
        message: 'No AI document analysis has been run yet for this transaction.',
      });
    }

    return res.status(200).json({
      success: true,
      data: transaction.documentAnalysisReport,
    });
  } catch (error) {
    next(error);
  }
};
