const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Ensure upload directories exist ─────────────────────────────────────────
const dirs = [
  'uploads/properties',
  'uploads/mutations',
  'uploads/evidence',
  'uploads/kyc',
];
dirs.forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ─── Storage engine ───────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const typeMap = {
      property: 'uploads/properties',
      mutation: 'uploads/mutations',
      evidence: 'uploads/evidence',
      kyc:      'uploads/kyc',
    };
    const folder = typeMap[req.uploadType] || 'uploads/misc';
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// ─── File type filter ────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype) || file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/msword' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (extOk || mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only images (jpg, png, webp, gif) and documents (pdf, doc, docx) are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
});

// ─── Middleware factories ─────────────────────────────────────────────────────
const uploadPropertyImage = (req, res, next) => {
  req.uploadType = 'property';
  upload.single('image')(req, res, next);
};

const uploadMutationDoc = (req, res, next) => {
  req.uploadType = 'mutation';
  upload.single('document')(req, res, next);
};

const uploadEvidence = (req, res, next) => {
  req.uploadType = 'evidence';
  upload.array('files', 5)(req, res, next); // up to 5 files
};

const uploadKyc = (req, res, next) => {
  req.uploadType = 'kyc';
  upload.single('document')(req, res, next);
};

module.exports = {
  uploadPropertyImage,
  uploadMutationDoc,
  uploadEvidence,
  uploadKyc,
};
