const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates a PDF escrow completion contract and saves it to disk.
 * Returns the file path (relative to uploads root) for storage on the transaction.
 *
 * @param {object} transaction  - Sequelize Transaction instance (with buyer, seller, property included)
 * @returns {Promise<string>}   - Relative path like /uploads/contracts/CONTRACT-xxx.pdf
 */
const generateEscrowContract = async (transaction) => {
  const contractsDir = path.join(__dirname, '..', 'uploads', 'contracts');
  if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir, { recursive: true });

  const filename = `CONTRACT-${transaction.transactionId || transaction.id}-${Date.now()}.pdf`;
  const filePath = path.join(contractsDir, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const gold = '#c8a96e';
    const dark = '#1a1a2e';
    const gray = '#555555';

    // ── Header ────────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 80).fill(dark);
    doc.fillColor(gold).fontSize(22).font('Helvetica-Bold')
      .text('ESCROWTRUST PLATFORM', 60, 22);
    doc.fillColor('#aaaaaa').fontSize(10).font('Helvetica')
      .text('Secure Property Escrow — Official Completion Certificate', 60, 50);

    doc.moveDown(3);

    // ── Title ─────────────────────────────────────────────────────────────────
    doc.fillColor(dark).fontSize(16).font('Helvetica-Bold')
      .text('ESCROW COMPLETION AGREEMENT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor(gray).fontSize(10).font('Helvetica')
      .text(`Transaction Reference: ${transaction.transactionId || transaction.id}`, { align: 'center' });
    doc.text(`Date of Completion: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });

    doc.moveDown(1.5);
    doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).strokeColor(gold).lineWidth(1).stroke();
    doc.moveDown(1);

    // ── Parties ───────────────────────────────────────────────────────────────
    const section = (title) => {
      doc.fillColor(dark).fontSize(12).font('Helvetica-Bold').text(title);
      doc.moveDown(0.3);
    };

    const field = (label, value) => {
      doc.fillColor(gray).fontSize(10).font('Helvetica')
        .text(`${label}: `, { continued: true })
        .fillColor(dark).font('Helvetica-Bold').text(value || 'N/A');
    };

    section('BUYER');
    field('Full Name', transaction.buyer?.name);
    field('Email', transaction.buyer?.email);
    doc.moveDown(0.8);

    section('SELLER');
    field('Full Name', transaction.seller?.name);
    field('Email', transaction.seller?.email);
    doc.moveDown(0.8);

    section('PROPERTY');
    field('Title', transaction.property?.title);
    field('Location', transaction.property?.location);
    field('UPI Code', transaction.property?.upiCode || 'N/A');
    doc.moveDown(0.8);

    section('FINANCIAL SUMMARY');
    const price = parseFloat(transaction.amount || 0);
    const buyerFee = parseFloat(transaction.buyerFee || 0);
    const sellerFee = parseFloat(transaction.sellerFee || 0);
    field('Property Price', `$${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    field('Buyer Platform Fee (1.0%)', `$${buyerFee.toFixed(2)}`);
    field('Seller Platform Fee (1.5%)', `$${sellerFee.toFixed(2)}`);
    field('Net Seller Payout', `$${(price - sellerFee).toFixed(2)}`);
    doc.moveDown(0.8);

    section('CRYPTOGRAPHIC SIGNATURES');
    field('Buyer Signature', transaction.buyerSignature || 'N/A');
    field('Buyer Signed At', transaction.buyerSignatureDate ? new Date(transaction.buyerSignatureDate).toISOString() : 'N/A');
    field('Seller Signature', transaction.sellerSignature || 'N/A');
    field('Seller Signed At', transaction.sellerSignatureDate ? new Date(transaction.sellerSignatureDate).toISOString() : 'N/A');
    doc.moveDown(0.8);

    section('ADMIN NOTES');
    doc.fillColor(gray).fontSize(10).font('Helvetica')
      .text(transaction.adminNotes || 'No admin notes recorded.', { width: doc.page.width - 120 });

    doc.moveDown(1.5);
    doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).strokeColor(gold).lineWidth(1).stroke();
    doc.moveDown(1);

    // ── Legal Footer ──────────────────────────────────────────────────────────
    doc.fillColor(gray).fontSize(9).font('Helvetica')
      .text(
        'This document is an automatically generated escrow completion certificate issued by EscrowTrust Platform. ' +
        'It serves as a digital record of the completed property transaction and is legally binding under the terms ' +
        'agreed upon by both parties at the time of transaction initiation. This certificate should be retained by ' +
        'both the buyer and seller for their records.',
        { width: doc.page.width - 120, align: 'justify' }
      );

    doc.moveDown(0.5);
    doc.fillColor('#aaaaaa').fontSize(8)
      .text(`Generated: ${new Date().toISOString()} | EscrowTrust v2.0.0`, { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(`/uploads/contracts/${filename}`));
    stream.on('error', reject);
  });
};

module.exports = { generateEscrowContract };
