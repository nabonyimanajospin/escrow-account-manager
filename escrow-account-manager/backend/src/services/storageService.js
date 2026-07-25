const uploadDocument = async ({ fileBuffer, fileName, mimeType }) => {
  const provider = process.env.STORAGE_PROVIDER || 'mock';

  if (process.env.NODE_ENV === 'production' && provider === 'mock') {
    throw new Error('Secure cloud document storage provider is not configured');
  }

  if (provider === 'mock') {
    // Return a mock persistent cloud storage URL
    const fileId = Math.random().toString(36).substring(2, 15);
    return {
      success: true,
      provider: 'mock-local',
      fileUrl: `https://storage.escrowtrust.com/vault/${fileId}_${fileName || 'doc.pdf'}`,
      mimeType: mimeType || 'application/pdf',
      uploadedAt: new Date(),
    };
  }

  // Adapter seam: plug AWS S3 / Google Cloud Storage SDK uploads here
  return {
    success: true,
    provider: process.env.STORAGE_PROVIDER,
    fileUrl: `https://s3.amazonaws.com/escrow-trust-bucket/${fileName}`,
    uploadedAt: new Date(),
  };
};

module.exports = {
  uploadDocument,
};
