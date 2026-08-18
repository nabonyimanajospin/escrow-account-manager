const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const gold = '#c8a96e';
const dark = '#1a1a2e';
const gray = '#555555';

const resolveBrandAsset = (...segments) => {
  const candidates = [
    path.join(__dirname, '..', '..', '..', 'brand', 'source', 'png', ...segments),
    path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'brand', ...segments),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
};

const getStableContractChecksum = (transaction) => {
  const docs = transaction.mutationDocuments || [];
  const deedChecksum = docs[0]?.sha256Checksum;
  if (deedChecksum) return deedChecksum;

  const id = transaction.id;
  const txRef = transaction.transactionId || (id ? `TXN-${id}` : 'UNKNOWN');
  const suffix = txRef.split('-').pop()?.toUpperCase() || String(id || '0');
  return `CHK-ESCROW-${id}-${suffix}`;
};

const getVerificationUrl = (checksum) => {
  const base = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/verify-contract/${encodeURIComponent(checksum)}`;
};

/**
 * Generates a PDF escrow completion contract and saves it to disk.
 * @returns {Promise<string>} Relative path like /uploads/contracts/CONTRACT-xxx.pdf
 */
const generateEscrowContract = async (transaction, customFilename = null) => {
  const contractsDir = path.join(__dirname, '..', 'uploads', 'contracts');
  if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir, { recursive: true });

  const filename = customFilename || `CONTRACT-${transaction.transactionId || transaction.id}-${Date.now()}.pdf`;
  const filePath = path.join(contractsDir, filename);

  const checksum = getStableContractChecksum(transaction);
  const verificationUrl = getVerificationUrl(checksum);

  let qrBuffer = null;
  try {
    qrBuffer = await QRCode.toBuffer(verificationUrl, { type: 'png', width: 132, margin: 1, errorCorrectionLevel: 'M' });
  } catch {
    qrBuffer = null;
  }

  const headerLogo =
    resolveBrandAsset('logo-mono-white@2x.png') ||
    resolveBrandAsset('logo-icon@2x.png') ||
    resolveBrandAsset('app-icon-512.png');

  const sealLogo =
    resolveBrandAsset('logo-icon@2x.png') ||
    resolveBrandAsset('logo-primary@2x.png');

  const price = parseFloat(transaction.amount || 0);
  const buyerFee = parseFloat(transaction.buyerFee || 0) || parseFloat((price * 0.01).toFixed(2));
  const sellerFee = parseFloat(transaction.sellerFee || 0) || parseFloat((price * 0.015).toFixed(2));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 120;

    // ── Branded header ───────────────────────────────────────────────────────
    doc.rect(0, 0, pageWidth, 88).fill(dark);

    if (headerLogo) {
      doc.image(headerLogo, 56, 18, { width: 52, height: 52 });
    }

    const headerTextX = headerLogo ? 118 : 60;
    doc.fillColor(gold).fontSize(20).font('Helvetica-Bold')
      .text('ESCROWTRUST', headerTextX, 24);
    doc.fillColor('#cccccc').fontSize(10).font('Helvetica')
      .text('Secure Property Escrow — Official Completion Certificate', headerTextX, 50, {
        width: pageWidth - headerTextX - 40,
      });

    doc.y = 108;

    // ── Title block ──────────────────────────────────────────────────────────
    doc.fillColor(dark).fontSize(16).font('Helvetica-Bold')
      .text('ESCROW COMPLETION AGREEMENT', { align: 'center' });
    doc.moveDown(0.4);
    doc.fillColor(gray).fontSize(10).font('Helvetica')
      .text(`Transaction Reference: ${transaction.transactionId || transaction.id}`, { align: 'center' });
    doc.text(
      `Date of Completion: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      { align: 'center' }
    );

    doc.moveDown(1);
    doc.moveTo(60, doc.y).lineTo(pageWidth - 60, doc.y).strokeColor(gold).lineWidth(1).stroke();
    doc.moveDown(0.8);

    const section = (title) => {
      doc.fillColor(dark).fontSize(11).font('Helvetica-Bold').text(title);
      doc.moveDown(0.25);
    };

    const field = (label, value) => {
      doc.fillColor(gray).fontSize(10).font('Helvetica')
        .text(`${label}: `, { continued: true })
        .fillColor(dark).font('Helvetica-Bold').text(String(value ?? 'N/A'));
    };

    section('BUYER');
    field('Full Name', transaction.buyer?.name);
    field('Email', transaction.buyer?.email);
    doc.moveDown(0.6);

    section('SELLER');
    field('Full Name', transaction.seller?.name);
    field('Email', transaction.seller?.email);
    doc.moveDown(0.6);

    section('PROPERTY');
    field('Title', transaction.property?.title);
    field('Location', transaction.property?.location);
    field('UPI Code', transaction.property?.upiCode || 'N/A');
    doc.moveDown(0.6);

    section('FINANCIAL SUMMARY');
    field('Property Price', `$${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    field('Buyer Platform Fee (1.0%)', `$${buyerFee.toFixed(2)}`);
    field('Seller Platform Fee (1.5%)', `$${sellerFee.toFixed(2)}`);
    field('Net Seller Payout', `$${(price - sellerFee).toFixed(2)}`);
    doc.moveDown(0.6);

    section('CRYPTOGRAPHIC SIGNATURES');
    field('Buyer Signature', transaction.buyerSignature || 'N/A');
    field('Buyer Signed At', transaction.buyerSignatureDate ? new Date(transaction.buyerSignatureDate).toISOString() : 'N/A');
    field('Seller Signature', transaction.sellerSignature || 'N/A');
    field('Seller Signed At', transaction.sellerSignatureDate ? new Date(transaction.sellerSignatureDate).toISOString() : 'N/A');
    doc.moveDown(0.6);

    section('ADMIN NOTES');
    doc.fillColor(gray).fontSize(10).font('Helvetica')
      .text(transaction.adminNotes || 'No admin notes recorded.', { width: contentWidth });

    // ── Footer: QR + seal (new page if needed) ───────────────────────────────
    if (doc.y > 620) doc.addPage();

    doc.moveDown(1.2);
    doc.moveTo(60, doc.y).lineTo(pageWidth - 60, doc.y).strokeColor(gold).lineWidth(1).stroke();
    doc.moveDown(0.8);

    const footerTop = doc.y;
    const qrSize = 100;
    const sealW = 180;
    const sealH = 88;
    const sealX = pageWidth - 60 - sealW;

    // QR verification (left)
    if (qrBuffer) {
      doc.image(qrBuffer, 60, footerTop, { width: qrSize, height: qrSize });
    } else {
      doc.roundedRect(60, footerTop, qrSize, qrSize, 4).strokeColor('#cccccc').stroke();
    }

    doc.fillColor(dark).fontSize(9).font('Helvetica-Bold')
      .text('Scan to verify authenticity', 60, footerTop + qrSize + 8, { width: qrSize + 40 });
    doc.fillColor(gray).fontSize(7).font('Helvetica')
      .text(verificationUrl, 60, footerTop + qrSize + 22, { width: contentWidth - sealW - 20, lineGap: 1 });
    doc.fillColor('#888888').fontSize(7).font('Helvetica')
      .text(`Checksum: ${checksum}`, 60, footerTop + qrSize + 48, { width: contentWidth - sealW - 20 });

    // Official seal (right) with logo
    doc.roundedRect(sealX, footerTop, sealW, sealH, 6)
      .lineWidth(2)
      .strokeColor(gold)
      .fillColor('#faf8f5')
      .fillAndStroke();

    if (sealLogo) {
      doc.image(sealLogo, sealX + (sealW / 2) - 14, footerTop + 8, { width: 28, height: 28 });
    }

    doc.fillColor(dark).fontSize(8).font('Helvetica-Bold')
      .text('OFFICIAL ESCROW SEAL', sealX + 8, footerTop + (sealLogo ? 40 : 12), { width: sealW - 16, align: 'center' });
    doc.fillColor('#10b981').fontSize(7).font('Helvetica-Bold')
      .text('CERTIFIED & VERIFIED', sealX + 8, footerTop + (sealLogo ? 52 : 26), { width: sealW - 16, align: 'center' });
    doc.fillColor(gray).fontSize(6).font('Helvetica')
      .text(`Issued: ${new Date().toLocaleDateString()}`, sealX + 8, footerTop + (sealLogo ? 64 : 38), { width: sealW - 16, align: 'center' });
    doc.fillColor(gold).fontSize(6).font('Helvetica-Bold')
      .text('ESCROWTRUST REGULATED', sealX + 8, footerTop + sealH - 14, { width: sealW - 16, align: 'center' });

    doc.y = footerTop + qrSize + 62;

    doc.moveDown(0.5);
    doc.fillColor(gray).fontSize(8).font('Helvetica')
      .text(
        'This certificate is issued by EscrowTrust Platform. Verify online using the QR code or checksum above. ' +
        'Retain this document with your property records. Forgery is discouraged — third parties should always scan the QR to confirm status.',
        { width: contentWidth, align: 'justify' }
      );

    doc.moveDown(0.4);
    doc.fillColor('#aaaaaa').fontSize(7)
      .text(`Generated: ${new Date().toISOString()} | EscrowTrust v2.0.0`, { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(`/uploads/contracts/${filename}`));
    stream.on('error', reject);
  });
};

module.exports = { generateEscrowContract, getStableContractChecksum, getVerificationUrl };
