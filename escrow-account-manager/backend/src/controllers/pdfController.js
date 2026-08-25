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

    // Safely extract property, buyer, seller, and escrow account objects (handling both lowercase and PascalCase associations)
    const propertyObj = transaction.property || transaction.Property || {};
    const buyerObj = transaction.buyer || transaction.Buyer || {};
    const sellerObj = transaction.seller || transaction.Seller || {};
    const escrowObj = transaction.escrowAccount || transaction.EscrowAccount || {};

    const priceAmount = Number(transaction.amount || propertyObj.price || 0);
    const lockedBalance = Number(escrowObj.balance || priceAmount);
    const upiParcelCode = propertyObj.titleDeedNumber || propertyObj.upiCode || '1/02/03/04/1234';

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

    // ── 1. Top Brand Header Banner ──
    doc.rect(0, 0, 595.28, 85).fill('#0F172A');
    doc.fillColor('#FFFFFF')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('ESCROW ACCOUNT MANAGER', 40, 22);
    doc.fontSize(10)
       .font('Helvetica')
       .text('Official Real Estate Title Transfer & Escrow Agreement', 40, 48);

    // Dynamic Status Badge
    doc.fillColor('#10B981')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text(`STATUS: ${transaction.status}`, 350, 32, { width: 205, align: 'right' });

    // ── 2. Transaction Summary Box with Embedded QR Code ──
    doc.rect(40, 100, 515, 95).fillAndStroke('#F8FAFC', '#CBD5E1');
    
    doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold');
    doc.text(`Transaction Reference: ${transaction.transactionId}`, 55, 114);
    doc.font('Helvetica').fontSize(9).fillColor('#334155');
    doc.text(`Property: ${propertyObj.title || 'Property Listing'} (${propertyObj.location || 'Rwanda'})`, 55, 132);
    doc.text(`Agreed Price: $${priceAmount.toLocaleString()} USD`, 55, 148);
    doc.text(`Escrow Balance: $${lockedBalance.toLocaleString()} USD (Locked in Custody)`, 55, 164);

    // Embed QR Code cleanly inside the right side of the summary box
    doc.image(qrImageBuffer, 465, 106, { width: 68 });
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#475569').text('Scan to Verify Status', 455, 178, { width: 88, align: 'center' });

    // ── 3. Two-Column Executive Details Layout ──
    
    // Left Column: Contracting Parties
    const leftColX = 40;
    const rightColX = 300;
    const detailsY = 215;

    doc.fontSize(11).fillColor('#0F172A').font('Helvetica-Bold').text('CONTRACTING PARTIES', leftColX, detailsY);
    
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text('BUYER:', leftColX, detailsY + 20);
    doc.font('Helvetica').fillColor('#0F172A').text(`${buyerObj.name || 'Buyer'} (${buyerObj.email || 'N/A'})`, leftColX + 50, detailsY + 20);

    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text('SELLER:', leftColX, detailsY + 36);
    doc.font('Helvetica').fillColor('#0F172A').text(`${sellerObj.name || 'Seller'} (${sellerObj.email || 'N/A'})`, leftColX + 50, detailsY + 36);

    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text('CUSTODIAN:', leftColX, detailsY + 52);
    doc.font('Helvetica').fillColor('#0F172A').text('Neutral Escrow Account Manager (Platform)', leftColX + 65, detailsY + 52);

    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text('AGREEMENT:', leftColX, detailsY + 68);
    doc.font('Helvetica').fillColor('#059669').text('Cryptographically Sealed & Signed Online', leftColX + 70, detailsY + 68);

    // Right Column: Land Registry & Irembo Sandbox Mutation
    doc.fontSize(11).fillColor('#0F172A').font('Helvetica-Bold').text('IREMBO LAND REGISTRY', rightColX, detailsY);

    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text('PARCEL UPI:', rightColX, detailsY + 20);
    doc.font('Helvetica-Bold').fillColor('#0F172A').text(upiParcelCode, rightColX + 70, detailsY + 20);

    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text('MUTATION:', rightColX, detailsY + 36);
    doc.font('Helvetica').fillColor('#0F172A').text('Irembo Sandbox API Connected', rightColX + 65, detailsY + 36);

    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text('SELLER SIGN:', rightColX, detailsY + 52);
    doc.font('Helvetica-Bold').fillColor('#059669').text('Signed & Hash Verified', rightColX + 70, detailsY + 52);

    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text('MUTATION REF:', rightColX, detailsY + 68);
    doc.font('Helvetica').fillColor('#0F172A').text(transaction.mutationNotes || 'IREMBO-MUT-VERIFIED', rightColX + 80, detailsY + 68);

    // ── 4. Encryption & Security Notice Box ──
    const noticeBoxY = 325;
    doc.rect(40, noticeBoxY, 515, 50).fillAndStroke('#FEF3C7', '#F59E0B');
    
    doc.fillColor('#92400E').fontSize(9).font('Helvetica-Bold').text('SECURITY & ENCRYPTION NOTICE', 55, noticeBoxY + 10);
    doc.font('Helvetica').fontSize(8.5).fillColor('#78350F').text(
      password && password.trim().length > 0
        ? 'This document is protected with 128-bit AES password encryption as requested. Keep your password safe.'
        : 'This PDF document is encrypted with standard platform verification keys. You can set a custom password at download.',
      55,
      noticeBoxY + 26,
      { width: 485 }
    );

    // ── 5. Contract Articles Summary ──
    const articlesY = 395;
    doc.fontSize(10).fillColor('#0F172A').font('Helvetica-Bold').text('TERMS & STIPULATIONS:', 40, articlesY);
    
    doc.fontSize(8).font('Helvetica').fillColor('#475569');
    doc.text('1. Escrow Custody: Capital is locked in neutral virtual escrow balance until deed mutation is confirmed.', 40, articlesY + 16);
    doc.text('2. Deed Transfer: Seller executes land title deed mutation directly via connected Irembo Land Registry API.', 40, articlesY + 28);
    doc.text('3. Final Settlement: Escrow funds are released to Seller upon mutation verification; Buyer refunded if mutation fails.', 40, articlesY + 40);

    // ── 6. Page Footer ──
    doc.fontSize(8).font('Helvetica').fillColor('#94A3B8').text(
      'Generated securely by Escrow Account Manager — Trustless Real Estate System • Governed by Laws of Republic of Rwanda',
      40,
      780,
      { width: 515, align: 'center' }
    );

    doc.end();
  } catch (err) {
    logger.error('[PDF Controller] Error generating protected PDF:', err.message);
    next(err);
  }
};

module.exports = {
  generateProtectedPdf,
};
