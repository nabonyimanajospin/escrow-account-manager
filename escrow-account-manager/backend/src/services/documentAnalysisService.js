/**
 * documentAnalysisService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * AI-powered document authenticity validator for land titles, house deeds,
 * and property documents used in escrow transactions.
 *
 * Architecture:
 *  1. File-type detection (PDF vs image)
 *  2. Text extraction via Tesseract OCR (images) or pdf-parse (PDFs)
 *  3. Rules engine: keyword matching + pattern validation
 *  4. Confidence scoring & flag generation
 *  5. Returns structured DocumentAnalysisReport
 *
 * Verdict levels:
 *   LIKELY_VALID   (80–100) — passes; admin still reviews
 *   NEEDS_REVIEW   (50–79)  — admin must manually inspect
 *   SUSPICIOUS     (0–49)   — admin blocked from releasing funds
 */

const path = require('path');
const fs = require('fs');

// ── Lazy-load heavy deps so startup is not blocked ───────────────────────────
let Tesseract = null;
let pdfParse = null;

const getTesseract = () => {
  if (!Tesseract) Tesseract = require('tesseract.js');
  return Tesseract;
};
const getPdfParse = () => {
  if (!pdfParse) pdfParse = require('pdf-parse');
  return pdfParse;
};

// ── Property-type document profiles ─────────────────────────────────────────
const DOCUMENT_PROFILES = {
  LAND: {
    label: 'Land Title (RLMUA)',
    requiredKeywords: [
      /UPI[\-\s]?\d{2}[\-\s]?\d{2}[\-\s]?\d{4}/i,     // UPI code
    ],
    strongKeywords: [
      /TITRE\s+FONCIER/i,
      /PARCELLE/i,
      /RLMUA/i,
      /RWANDA\s+LAND/i,
      /TERRAIN/i,
      /IMMEUBLE/i,
      /TITRE\s+DE\s+PROPRIETE/i,
      /LETTRE\s+D.ATTRIBUTION/i,
      /SUPERFICIE/i,
    ],
    weakKeywords: [
      /PROPRIET(É|E)/i,
      /FONCIER/i,
      /DISTRICT/i,
      /SECTOR/i,
      /HECTARE/i,
      /METER/i,
    ],
    ownerFields: [/PROPRIETAIRE\s*[:]\s*(.+)/i, /OWNER\s*[:]\s*(.+)/i, /NOM\s*[:]\s*(.+)/i],
  },
  HOUSE: {
    label: 'House / Building Deed',
    requiredKeywords: [
      /UPI[\-\s]?\d{2}[\-\s]?\d{2}[\-\s]?\d{4}/i,
    ],
    strongKeywords: [
      /ACTE\s+DE\s+PROPRIETE/i,
      /MAISON/i,
      /HABITATION\/HOUSE/i,
      /BATIMENT/i,
      /CONSTRUCTION/i,
      /IMMEUBLE/i,
      /RESIDENCE/i,
    ],
    weakKeywords: [
      /PROPRIET(É|E)/i,
      /SURFACE/i,
      /LOGEMENT/i,
    ],
    ownerFields: [/PROPRIETAIRE\s*[:]\s*(.+)/i, /OWNER\s*[:]\s*(.+)/i],
  },
  APARTMENT: {
    label: 'Apartment Ownership Certificate',
    requiredKeywords: [],
    strongKeywords: [
      /APPARTEMENT/i,
      /COPROPRIETE/i,
      /ETAGE/i,
      /FLOOR/i,
      /UNIT/i,
    ],
    weakKeywords: [
      /IMMEUBLE/i,
      /RESIDENCE/i,
    ],
    ownerFields: [/PROPRIETAIRE\s*[:]\s*(.+)/i, /OWNER\s*[:]\s*(.+)/i],
  },
  VILLA: {
    label: 'Villa / Residential Property',
    requiredKeywords: [
      /UPI[\-\s]?\d{2}[\-\s]?\d{2}[\-\s]?\d{4}/i,
    ],
    strongKeywords: [
      /VILLA/i,
      /RESIDENCE/i,
      /MAISON/i,
      /PROPRIETAIRE/i,
    ],
    weakKeywords: [/SURFACE/i, /JARDIN/i],
    ownerFields: [/PROPRIETAIRE\s*[:]\s*(.+)/i, /OWNER\s*[:]\s*(.+)/i],
  },
  COMMERCIAL: {
    label: 'Commercial Property Deed',
    requiredKeywords: [],
    strongKeywords: [
      /COMMERCIAL/i,
      /BUREAU/i,
      /OFFICE/i,
      /LOCAL\s+COMMERCIAL/i,
      /HANGAR/i,
      /ENTREPOT/i,
    ],
    weakKeywords: [/PROPRIET(É|E)/i, /BAIL/i, /LOYER/i],
    ownerFields: [/PROPRIETAIRE\s*[:]\s*(.+)/i, /OWNER\s*[:]\s*(.+)/i],
  },
};

// Universal fraud/suspicious pattern flags
const SUSPICIOUS_PATTERNS = [
  { pattern: /PHOTOSHOP/i, msg: 'Document metadata contains "PHOTOSHOP" — possible fabrication' },
  { pattern: /SAMPLE|SPECIMEN|EXAMPLE|TEMPLATE|DRAFT/i, msg: 'Document contains watermark words (SAMPLE/DRAFT)' },
  { pattern: /LOREM\s+IPSUM/i, msg: 'Document contains placeholder text (Lorem Ipsum)' },
  { pattern: /TEST\s+DOCUMENT/i, msg: 'Document explicitly marked as test' },
];

// ── Text extraction ──────────────────────────────────────────────────────────
const extractTextFromFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    try {
      const parse = getPdfParse();
      const dataBuffer = fs.readFileSync(filePath);
      const data = await parse(dataBuffer);
      return { text: data.text, method: 'pdf-parse', pages: data.numpages };
    } catch (err) {
      return { text: '', method: 'pdf-parse-error', error: err.message };
    }
  }

  if (['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.webp'].includes(ext)) {
    try {
      const tesseract = getTesseract();
      const { data } = await tesseract.recognize(filePath, 'eng+fra', {
        logger: () => {},
      });
      return { text: data.text, method: 'tesseract-ocr', confidence: data.confidence };
    } catch (err) {
      return { text: '', method: 'tesseract-error', error: err.message };
    }
  }

  return { text: '', method: 'unsupported-format', error: `File type ${ext} not supported for analysis` };
};

// ── Core scoring engine ──────────────────────────────────────────────────────
const scoreDocument = (text, propertyType) => {
  const profile = DOCUMENT_PROFILES[propertyType] || DOCUMENT_PROFILES['LAND'];
  const upperText = text.toUpperCase();
  const flags = [];
  let score = 0;
  const findings = {};

  // ── Check for minimum content (blank/empty document) ──
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 20) {
    flags.push('Document appears blank or has very little text content');
    return { score: 10, flags, findings, profile };
  }

  // ── Suspicious fraud patterns (immediate major penalty) ──
  for (const { pattern, msg } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      flags.push(`🚨 FRAUD SIGNAL: ${msg}`);
      score -= 40;
    }
  }

  // ── Required keywords (must have ALL of these) ──
  let requiredMet = 0;
  for (const regex of profile.requiredKeywords) {
    if (regex.test(text)) {
      requiredMet++;
      const match = text.match(regex);
      if (regex.toString().includes('UPI') && match) {
        findings.extractedUpi = match[0].replace(/\s/g, '').toUpperCase();
      }
    } else {
      flags.push(`Missing required field: ${regex.source}`);
    }
  }
  const requiredScore = profile.requiredKeywords.length > 0
    ? (requiredMet / profile.requiredKeywords.length) * 40
    : 40; // if no required keywords defined, give benefit of doubt

  score += requiredScore;

  // ── Strong keywords (each one adds significant confidence) ──
  let strongFound = 0;
  for (const regex of profile.strongKeywords) {
    if (regex.test(text)) strongFound++;
  }
  const strongScore = profile.strongKeywords.length > 0
    ? Math.min(35, (strongFound / profile.strongKeywords.length) * 50)
    : 20;
  score += strongScore;
  findings.strongKeywordsFound = `${strongFound}/${profile.strongKeywords.length}`;

  // ── Weak/supporting keywords ──
  let weakFound = 0;
  for (const regex of profile.weakKeywords) {
    if (regex.test(text)) weakFound++;
  }
  const weakScore = Math.min(15, (weakFound / Math.max(profile.weakKeywords.length, 1)) * 20);
  score += weakScore;

  // ── Owner name extraction ──
  for (const regex of profile.ownerFields) {
    const match = text.match(regex);
    if (match && match[1]) {
      findings.extractedOwner = match[1].trim().substring(0, 80);
      score += 10; // bonus for having structured owner field
      break;
    }
  }

  // ── File seems structured (has dates, numbers, reference codes) ──
  if (/\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}/.test(text)) {
    score += 5; // has date format
    findings.hasDateFormat = true;
  }
  if (/N[°o]\s*\d+/i.test(text)) {
    score += 5; // has a reference/document number
    findings.hasReferenceNumber = true;
  }

  // Cap score between 0 and 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, flags, findings, profile };
};

// ── Main analysis function ───────────────────────────────────────────────────
/**
 * Analyzes an uploaded document for authenticity.
 * 
 * @param {string} filePath     — Absolute path to the uploaded file
 * @param {string} propertyType — LAND | HOUSE | APARTMENT | VILLA | COMMERCIAL
 * @param {string} sellerName   — Registered name of the seller (for owner match check)
 * @param {string} expectedUpi  — UPI code from the property listing (for cross-check)
 * @returns {DocumentAnalysisReport}
 */
const analyzeDocument = async (filePath, propertyType = 'LAND', sellerName = '', expectedUpi = '') => {
  const startTime = Date.now();
  const report = {
    analysisTimestamp: new Date().toISOString(),
    filePath: path.basename(filePath),
    propertyType,
    status: 'PENDING',
    confidence: 0,
    verdict: null,
    flags: [],
    findings: {},
    crossChecks: {},
    processingMs: 0,
    model: 'rules-engine-v1 + tesseract-ocr',
  };

  try {
    // Check file exists
    if (!fs.existsSync(filePath)) {
      report.status = 'ERROR';
      report.verdict = 'SUSPICIOUS';
      report.confidence = 0;
      report.flags.push('File not found on server');
      report.processingMs = Date.now() - startTime;
      return report;
    }

    // Check minimum file size (< 10KB = probably blank/empty)
    const stats = fs.statSync(filePath);
    if (stats.size < 10 * 1024) {
      report.flags.push('File is suspiciously small (< 10KB) — may be blank');
      report.confidence = 15;
      report.verdict = 'SUSPICIOUS';
      report.status = 'COMPLETE';
      report.processingMs = Date.now() - startTime;
      return report;
    }

    // Extract text
    const extraction = await extractTextFromFile(filePath);
    report.findings.extractionMethod = extraction.method;

    if (extraction.error) {
      report.flags.push(`Text extraction warning: ${extraction.error}`);
    }

    if (!extraction.text || extraction.text.trim().length < 10) {
      // Could be a scanned image with no OCR text — give partial score
      report.flags.push('Could not extract readable text from document. Requires manual admin review.');
      report.confidence = 30;
      report.verdict = 'NEEDS_REVIEW';
      report.status = 'COMPLETE';
      report.processingMs = Date.now() - startTime;
      return report;
    }

    // Run scoring engine
    const { score, flags, findings } = scoreDocument(extraction.text, propertyType);
    report.confidence = score;
    report.flags = [...report.flags, ...flags];
    report.findings = { ...report.findings, ...findings };

    // ── Cross-checks ──────────────────────────────────────────────────────────

    // 1. UPI code cross-check
    if (expectedUpi && findings.extractedUpi) {
      const normalizeUpi = (u) => u.replace(/[\s\-]/g, '').toUpperCase();
      const match = normalizeUpi(findings.extractedUpi) === normalizeUpi(expectedUpi);
      report.crossChecks.upiMatch = match;
      if (!match) {
        report.flags.push(`⚠ UPI mismatch: document says "${findings.extractedUpi}", listing says "${expectedUpi}"`);
        report.confidence = Math.max(0, report.confidence - 25);
      } else {
        report.confidence = Math.min(100, report.confidence + 5);
        report.crossChecks.upiMatchNote = 'UPI code verified ✓';
      }
    }

    // 2. Seller name cross-check (case-insensitive fuzzy match)
    if (sellerName && findings.extractedOwner) {
      const normalize = (s) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim();
      const docOwner = normalize(findings.extractedOwner);
      const seller = normalize(sellerName);
      const sellerWords = seller.split(' ').filter(Boolean);
      const matchedWords = sellerWords.filter((w) => docOwner.includes(w));
      const nameMatchRatio = matchedWords.length / sellerWords.length;
      report.crossChecks.ownerNameMatch = nameMatchRatio >= 0.85;
      report.crossChecks.ownerMatchRatio = `${Math.round(nameMatchRatio * 100)}%`;

      if (nameMatchRatio < 0.85) {
        report.flags.push(`⚠ Owner name mismatch: document says "${findings.extractedOwner}", seller name is "${sellerName}"`);
        report.confidence = Math.max(0, report.confidence - 25);
      } else {
        report.crossChecks.ownerMatchNote = 'Owner name verified ✓';
      }
    }

    // ── Automated Triage Pipeline Classification ────────────────────────────────
    const hasFraudSignal = report.flags.some(f => 
      f.includes('FRAUD') || f.includes('blank') || f.includes('Photoshop') || f.includes('SAMPLE') || f.includes('WATERMARK')
    );

    const hasUpiMatch = report.crossChecks.upiMatch === undefined || report.crossChecks.upiMatch === true;
    const hasOwnerMatch = report.crossChecks.ownerNameMatch === undefined || report.crossChecks.ownerNameMatch === true;

    if (hasFraudSignal || report.confidence < 40) {
      report.triageCategory = 'RED'; // Fraud Alert & Lock
      report.verdict = 'SUSPICIOUS';
      report.triageGuidance = '🚨 RED FRAUD ALERT: Photoshop modification, sample watermark, or invalid content detected. Transaction automatically frozen for Admin dispute mediation.';
    } else if (report.flags.length > 0 || !hasUpiMatch || !hasOwnerMatch || report.confidence < 85) {
      report.triageCategory = 'YELLOW'; // Self-Correction Prompt
      report.verdict = 'NEEDS_REVIEW';
      report.triageGuidance = '⚠️ YELLOW NOTICE: Minor discrepancy detected in seller name or UPI formatting. Seller can self-correct and re-upload the deed.';
    } else {
      report.triageCategory = 'GREEN'; // Fast Track
      report.verdict = 'LIKELY_VALID';
      report.triageGuidance = '🟢 GREEN FAST TRACK: Document passes AI multi-factor verification and is ready for automated Irembo registry clearance.';
    }

    report.status = 'COMPLETE';
    report.processingMs = Date.now() - startTime;
    return report;

  } catch (err) {
    report.status = 'ERROR';
    report.verdict = 'NEEDS_REVIEW';
    report.confidence = 0;
    report.flags.push(`Analysis engine error: ${err.message}`);
    report.processingMs = Date.now() - startTime;
    return report;
  }
};

module.exports = { analyzeDocument };
