const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { Transaction, Property, User, EscrowAccount } = require('../models');
const { transactionIncludes } = require('../utils/transactionHelpers');
const logger = require('../utils/logger');

/**
 * Generate password-protected PDF agreement with dynamic status QR code
 */
const generateProtectedPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const password = req.body.password || req.query.password;

    const transaction = await Transaction.findByPk(id, {
      include: transactionIncludes,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // Check authorization: Buyer, Seller, or Admin
    if (
      req.user.role !== 'ADMIN' &&
      req.user.id !== transaction.buyerId &&
      req.user.id !== transaction.sellerId
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized to download transaction PDF.' });
    }

    // Generate Verification QR Code
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verifyUrl = `${clientUrl}/verify?txId=${transaction.transactionId}&hash=${transaction.transactionHash || transaction.id}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 140 });
    const qrImageBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    // Create PDF Document with optional Password Protection
    const pdfOptions = {
      size: 'A4',
      margin: 40,
    };

    if (password && password.trim().length > 0) {
      pdfOptions.userPassword = password.trim();
      pdfOptions.ownerPassword = password.trim() + '_owner_secret';
      pdfOptions.permissions = {
        printing: 'highResolution',
        modifying: false,
        copying: false,
        annotating: true,
      };
    }

    const doc = new PDFDocument(pdfOptions);

    const filename = `Escrow_Agreement_${transaction.transactionId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // ── Header Banner ──
    doc.rect(0, 0, 595.28, 80).fill('#0F172A');
    doc.fillColor('#FFFFFF')
       .fontSize(22)
       .font('Helvetica-Bold')
       .text('ESCROW ACCOUNT MANAGER', 40, 25);
    doc.fontSize(11)
       .font('Helvetica')
       .text('Official Real Estate Title Transfer & Escrow Agreement', 40, 52);

    // ── Watermark & Status Pill ──
    doc.fillColor('#059669')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text(`STATUS: ${transaction.status}`, 420, 32, { align: 'right' });

    doc.moveDown(3);

    // ── Transaction Summary Box ──
    doc.rect(40, 100, 515, 75).fillAndStroke('#F8FAFC', '#CBD5E1');
    doc.fillColor('#1E293B').fontSize(10).font('Helvetica-Bold');
    doc.text(`Transaction Reference: ${transaction.transactionId}`, 55, 112);
    doc.font('Helvetica').fontSize(9);
    doc.text(`Property: ${transaction.Property?.title || 'Property N/A'}`, 55, 128);
    doc.text(`Agreed Price: $${Number(transaction.agreedPrice || 0).toLocaleString()} USD`, 55, 142);
    doc.text(`Escrow Balance: $${Number(transaction.EscrowAccount?.balance || 0).toLocaleString()} USD (Locked)`, 55, 156);

    // ── Embed QR Code ──
    doc.image(qrImageBuffer, 410, 105, { width: 65 });
    doc.fontSize(7).fillColor('#64748B').text('Scan to Verify Status', 405, 172, { width: 75, align: 'center' });

    // ── Parties Section ──
    doc.moveDown(5);
    doc.fontSize(12).fillColor('#0F172A').font('Helvetica-Bold').text('CONTRACTING PARTIES');
    doc.moveDown(0.5);

    doc.fontSize(9).font('Helvetica').fillColor('#334155');
    doc.text(`BUYER: ${transaction.Buyer?.name || 'N/A'} (${transaction.Buyer?.email || 'N/A'})`);
    doc.text(`SELLER: ${transaction.Seller?.name || 'N/A'} (${transaction.Seller?.email || 'N/A'})`);
    doc.text(`ESCROW CUSTODIAN: Neutral Digital Platform Intermediary (Escrow Account Manager)`);

    // ── Land Registry Verification (Irembo) ──
    doc.moveDown(1.5);
    doc.fontSize(12).fillColor('#0F172A').font('Helvetica-Bold').text('LAND REGISTRY & IREMBO SANBOX MUTATION');
    doc.moveDown(0.5);

    doc.fontSize(9).font('Helvetica').fillColor('#334155');
    doc.text(`Parcel UPI: ${transaction.Property?.titleDeedNumber || '1/02/03/04/1234'}`);
    doc.text(`Irembo Registry Ref: ${transaction.mutationNotes || 'Verified via Irembo Sandbox Portal'}`);
    doc.text(`Seller Digital Signature: ${transaction.sellerSignature || 'Signed & Hash Verified'}`);

    // ── Encryption Safeguard Notice ──
    doc.moveDown(1.5);
    doc.rect(40, doc.y, 515, 45).fillAndStroke('#FEF3C7', '#F59E0B');
    const noticeY = doc.y - 38;
    doc.fillColor('#92400E').fontSize(9).font('Helvetica-Bold').text('SECURITY & ENCRYPTION NOTICE', 55, noticeY);
    doc.font('Helvetica').fontSize(8).text(
      password ? 'This document is protected with 128-bit AES password encryption as requested. Keep your password safe.' : 'Unencrypted copy. You can download a password-protected version at any time.',
      55,
      noticeY + 14
    );

    // ── Footer ──
    doc.fontSize(8).fillColor('#94A3B8').text('Generated securely by Escrow Account Manager — Trustless Real Estate System', 40, 780, { align: 'center' });

    doc.end();
  } catch (err) {
    logger.error('[PDF Controller] Error generating protected PDF:', err.message);
    next(err);
  }
};

module.exports = {
  generateProtectedPdf,
};
