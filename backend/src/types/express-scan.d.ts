import 'express-serve-static-core';

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        /** Set by MediScan upload middleware after Cloudinary upload */
        cloudinaryUrl?: string;
        cloudinaryPublicId?: string;
        isDicom?: boolean;
        /** DICOM conversion delegated to Python MediScan service (sharp cannot decode DICOM) */
        dicomPythonConversion?: boolean;
      }
    }
  }
}

export {};
