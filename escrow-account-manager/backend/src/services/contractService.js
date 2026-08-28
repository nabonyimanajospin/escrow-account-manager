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
    path.join(__dirname, '..', '..', 'frontend', 'public', 'brand', ...segments),
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

const money = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Generates a PDF escrow completion contract and saves it to disk.
 * @returns {Promise<string>} Relative path like /uploads/contracts/CONTRACT-xxx.pdf
 */
const generateEscrowContract = async (transaction, customFilename = null, customPassword = null) => {
  const contractsDir = path.join(__dirname, '..', 'uploads', 'contracts');
  if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir, { recursive: true });

  const filename = customFilename || `CONTRACT-${transaction.transactionId || transaction.id}-${Date.now()}.pdf`;
  const filePath = path.join(contractsDir, filename);

  const checksum = getStableContractChecksum(transaction);
  const verificationUrl = getVerificationUrl(checksum);

  let qrBuffer = null;
  try {
    qrBuffer = await QRCode.toBuffer(verificationUrl, {
      type: 'png',
      width: 132,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
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
  const totalBuyer = price + buyerFee;
  const sellerNet = price - sellerFee;

  const buyerName = transaction.buyer?.name || 'Buyer';
  const sellerName = transaction.seller?.name || 'Seller';
  const buyerEmail = transaction.buyer?.email || 'N/A';
  const sellerEmail = transaction.seller?.email || 'N/A';
  const propertyTitle = transaction.property?.title || 'N/A';
  const propertyLocation = transaction.property?.location || 'N/A';
  const upiCode = transaction.property?.upiCode || transaction.property?.upi || 'N/A';
  const txRef = transaction.transactionId || `TXN-${transaction.id}`;
  const completionDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return new Promise((resolve, reject) => {
    const docOptions = { margin: 50, size: 'A4' };
    if (customPassword) {
      docOptions.userPassword = String(customPassword);
      docOptions.ownerPassword = String(customPassword);
    }
    const doc = new PDFDocument(docOptions);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const left = 50;
    const contentWidth = pageWidth - 100;

    const ensureSpace = (needed = 80) => {
      if (doc.y + needed > doc.page.height - 60) {
        doc.addPage();
        doc.y = 50;
      }
    };

    const goldLine = () => {
      doc.moveTo(left, doc.y).lineTo(pageWidth - 50, doc.y).strokeColor(gold).lineWidth(1).stroke();
      doc.moveDown(0.7);
    };

    const articleTitle = (title, subtitle) => {
      ensureSpace(36);
      doc.fillColor(dark).fontSize(11).font('Helvetica-Bold').text(title, left, doc.y, { width: contentWidth });
      if (subtitle) {
        doc.fillColor(gold).fontSize(8).font('Helvetica-Bold').text(subtitle.toUpperCase(), { width: contentWidth });
      }
      doc.moveDown(0.35);
    };

    const bullet = (text) => {
      ensureSpace(28);
      doc.fillColor(dark).fontSize(9).font('Helvetica').text(`•  ${text}`, left + 8, doc.y, {
        width: contentWidth - 8,
        align: 'justify',
        lineGap: 1.5,
      });
      doc.moveDown(0.35);
    };

    const kv = (label, value) => {
      ensureSpace(16);
      const y = doc.y;
      doc.fillColor(gray).fontSize(9).font('Helvetica').text(label, left + 8, y, { width: 160 });
      doc.fillColor(dark).fontSize(9).font('Helvetica-Bold').text(String(value ?? 'N/A'), left + 170, y, {
        width: contentWidth - 170,
      });
      doc.y = Math.max(doc.y, y + 14);
    };

    // ── Header ──────────────────────────────────────────────────────────────
    doc.rect(0, 0, pageWidth, 88).fill(dark);

    if (headerLogo) {
      try {
        doc.image(headerLogo, 50, 18, { width: 52, height: 52 });
      } catch {
        /* ignore missing image decode */
      }
    }

    const headerTextX = headerLogo ? 112 : 50;
    doc.fillColor(gold).fontSize(18).font('Helvetica-Bold').text('ESCROWTRUST', headerTextX, 24);
    doc.fillColor('#cccccc').fontSize(9).font('Helvetica')
      .text('Secure Property Escrow — Official Completion Certificate', headerTextX, 50, {
        width: pageWidth - headerTextX - 40,
      });

    doc.y = 108;

    doc.fillColor(dark).fontSize(15).font('Helvetica-Bold')
      .text('ESCROW COMPLETION AGREEMENT', { align: 'center' });
    doc.moveDown(0.35);
    doc.fillColor(gray).fontSize(9).font('Helvetica')
      .text(`Transaction Reference: ${txRef}`, { align: 'center' });
    doc.text(`Date of Completion: ${completionDate}`, { align: 'center' });

    doc.moveDown(0.8);
    goldLine();

    // ── Schedule (facts) ────────────────────────────────────────────────────
    articleTitle('SCHEDULE A — PARTIES & PROPERTY', 'Binding identities and subject matter');
    kv('Buyer full name', buyerName);
    kv('Buyer email', buyerEmail);
    kv('Seller full name', sellerName);
    kv('Seller email', sellerEmail);
    kv('Property title', propertyTitle);
    kv('Property location', propertyLocation);
    kv('UPI / parcel code', upiCode);
    doc.moveDown(0.4);

    articleTitle('SCHEDULE B — FINANCIAL TERMS', 'Amounts held and payable under this Agreement');
    kv('Property price', money(price));
    kv('Buyer platform fee (1.0%)', money(buyerFee));
    kv('Total amount payable by Buyer', money(totalBuyer));
    kv('Seller platform fee (1.5%)', money(sellerFee));
    kv('Net amount due to Seller', money(sellerNet));
    doc.moveDown(0.5);

    // ── Articles (legal substance) ──────────────────────────────────────────
    articleTitle('ARTICLE 1 — SUBJECT MATTER & WARRANTIES');
    bullet(`Seller warrants lawful ownership of the Property described in Schedule A and authority to transfer title to Buyer for the purchase price of ${money(price)}.`);
    bullet('Buyer agrees to purchase the Property under the escrow terms of this Agreement.');
    bullet('Title shall pass only through the EscrowTrust escrow and mutation process.');
    doc.moveDown(0.25);

    articleTitle('ARTICLE 2 — ESCROW CUSTODY');
    bullet(`Buyer has deposited (or caused to be deposited) ${money(totalBuyer)} into EscrowTrust custody, inclusive of the stated platform fee.`);
    bullet('Escrowed funds shall not be paid to Seller, refunded to Buyer, or otherwise released except as authorized under this Agreement.');
    bullet('Platform fees are earned service charges of EscrowTrust and are deducted as shown in Schedule B.');
    doc.moveDown(0.25);

    articleTitle('ARTICLE 3 — OBLIGATIONS OF THE PARTIES');
    bullet('Seller shall deliver accurate ownership and mutation documents required to transfer title, cooperate with registry verification, and shall not encumber or dispose of the Property while funds remain in escrow.');
    bullet('Buyer shall fund escrow as required and accept transfer of title upon successful verification, subject to the Property matching Schedule A.');
    doc.moveDown(0.25);

    articleTitle('ARTICLE 4 — CONDITIONS OF RELEASE & REFUND');
    bullet('Funds may be released to Seller only when mutation/transfer documents have been administratively verified, no unresolved dispute freeze is active, and an authorized EscrowTrust administrator approves release of the net amount due to Seller.');
    bullet('If transfer cannot be completed due to material title failure, fraud, or another ground recognized under platform dispute rules, escrowed principal may be refunded to Buyer after administrative determination.');
    bullet('Seller acknowledgment of receipt of released funds confirms settlement of the Seller payout under this Agreement.');
    doc.moveDown(0.25);

    articleTitle('ARTICLE 5 — DIGITAL AUTHORITY & GOVERNING LAW');
    bullet('One-time codes and cryptographic approvals logged on EscrowTrust constitute each party’s electronic signature and consent to the relevant escrow action.');
    bullet('In-app notices, and email/SMS where configured, are valid notice channels for this transaction.');
    bullet('This Agreement is governed by the laws of the Republic of Rwanda. Platform dispute procedures apply before court action where required by EscrowTrust rules.');
    bullet('If any provision is held unenforceable, the remaining provisions continue in full force.');
    doc.moveDown(0.4);

    articleTitle('ARTICLE 6 — EXECUTION RECORD');
    kv('Buyer signature', transaction.buyerSignature || 'N/A');
    kv(
      'Buyer signed at',
      transaction.buyerSignedAt
        ? new Date(transaction.buyerSignedAt).toISOString()
        : (transaction.buyerSignatureDate ? new Date(transaction.buyerSignatureDate).toISOString() : 'N/A')
    );
    kv('Seller signature', transaction.sellerSignature || 'N/A');
    kv(
      'Seller signed at',
      transaction.sellerSignedAt
        ? new Date(transaction.sellerSignedAt).toISOString()
        : (transaction.sellerSignatureDate ? new Date(transaction.sellerSignatureDate).toISOString() : 'N/A')
    );
    doc.moveDown(0.35);
    doc.fillColor(dark).fontSize(9).font('Helvetica-Bold').text('Admin notes', left);
    doc.moveDown(0.2);
    doc.fillColor(gray).fontSize(9).font('Helvetica')
      .text(transaction.adminNotes || 'No admin notes recorded.', left, doc.y, { width: contentWidth });
    doc.moveDown(0.8);

    // ── Footer: QR + seal ───────────────────────────────────────────────────
    ensureSpace(160);
    goldLine();

    const footerTop = doc.y;
    const qrSize = 100;
    const sealW = 180;
    const sealH = 88;
    const sealX = pageWidth - 50 - sealW;

    if (qrBuffer) {
      doc.image(qrBuffer, left, footerTop, { width: qrSize, height: qrSize });
    } else {
      doc.roundedRect(left, footerTop, qrSize, qrSize, 4).strokeColor('#cccccc').stroke();
    }

    doc.fillColor(dark).fontSize(8).font('Helvetica-Bold')
      .text('Scan to verify authenticity', left, footerTop + qrSize + 8, { width: qrSize + 50 });
    doc.fillColor(gray).fontSize(7).font('Helvetica')
      .text(verificationUrl, left, footerTop + qrSize + 22, {
        width: contentWidth - sealW - 20,
        lineGap: 1,
      });
    doc.fillColor('#888888').fontSize(7).font('Helvetica')
      .text(`Checksum: ${checksum}`, left, footerTop + qrSize + 48, {
        width: contentWidth - sealW - 20,
      });

    doc.roundedRect(sealX, footerTop, sealW, sealH, 6)
      .lineWidth(2)
      .strokeColor(gold)
      .fillColor('#faf8f5')
      .fillAndStroke();

    if (sealLogo) {
      try {
        doc.image(sealLogo, sealX + sealW / 2 - 14, footerTop + 8, { width: 28, height: 28 });
      } catch {
        /* ignore */
      }
    }

    const sealTextTop = sealLogo ? 40 : 12;
    doc.fillColor(dark).fontSize(8).font('Helvetica-Bold')
      .text('OFFICIAL ESCROW SEAL', sealX + 8, footerTop + sealTextTop, { width: sealW - 16, align: 'center' });
    doc.fillColor('#10b981').fontSize(7).font('Helvetica-Bold')
      .text('CERTIFIED & VERIFIED', sealX + 8, footerTop + sealTextTop + 12, { width: sealW - 16, align: 'center' });
    doc.fillColor(gray).fontSize(6).font('Helvetica')
      .text(`Issued: ${new Date().toLocaleDateString()}`, sealX + 8, footerTop + sealTextTop + 24, {
        width: sealW - 16,
        align: 'center',
      });
    doc.fillColor(gold).fontSize(6).font('Helvetica-Bold')
      .text('ESCROWTRUST REGULATED', sealX + 8, footerTop + sealH - 14, {
        width: sealW - 16,
        align: 'center',
      });

    doc.y = footerTop + qrSize + 62;
    doc.moveDown(0.4);
    doc.fillColor(gray).fontSize(8).font('Helvetica').text(
      'This Agreement is issued by EscrowTrust. Verify online using the QR code or checksum. ' +
        'Retain this document with your property records. Third parties should scan the QR to confirm authenticity.',
      { width: contentWidth, align: 'justify' }
    );

    doc.moveDown(0.35);
    doc.fillColor('#aaaaaa').fontSize(7)
      .text(`Generated: ${new Date().toISOString()} | EscrowTrust Contract v3.0`, { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(`/uploads/contracts/${filename}`));
    stream.on('error', reject);
  });
};

module.exports = { generateEscrowContract, getStableContractChecksum, getVerificationUrl };
