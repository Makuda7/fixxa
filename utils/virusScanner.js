const CloudmersiveVirusApiClient = require('cloudmersive-virus-api-client');
const logger = require('../config/logger');
const fs = require('fs');

// Configure API client
const defaultClient = CloudmersiveVirusApiClient.ApiClient.instance;
const Apikey = defaultClient.authentications['Apikey'];
Apikey.apiKey = process.env.CLOUDMERSIVE_API_KEY;

const apiInstance = new CloudmersiveVirusApiClient.ScanApi();

/**
 * Scan a file for viruses and malware
 * @param {Object} file - Multer file object or file path
 * @returns {Promise<Object>} - { clean: boolean, foundViruses: array, scanResult: string }
 */
async function scanFile(file) {
  try {
    // Handle both file path (string) and multer file object
    let inputFile;
    let filePath;

    if (typeof file === 'string') {
      // File path provided
      filePath = file;
      if (!fs.existsSync(filePath)) {
        logger.error('Virus scan failed - file not found', { filePath });
        throw new Error('File not found');
      }
      inputFile = fs.readFileSync(filePath);
    } else if (file && file.path) {
      // Multer file object with local path (before Cloudinary upload)
      filePath = file.path;
      if (!fs.existsSync(filePath)) {
        logger.error('Virus scan failed - file not found', { filePath });
        throw new Error('File not found');
      }
      inputFile = fs.readFileSync(filePath);
    } else if (file && file.buffer) {
      // Multer file object with buffer (memory storage)
      inputFile = file.buffer;
      filePath = file.originalname || 'buffer';
    } else {
      throw new Error('Invalid file input');
    }

    logger.info('Starting virus scan', {
      fileName: file.originalname || filePath,
      fileSize: inputFile.length
    });

    // Scan the file
    return new Promise((resolve, reject) => {
      apiInstance.scanFile(inputFile, (error, data, response) => {
        if (error) {
          logger.error('Virus scan API error', {
            error: error.message,
            fileName: file.originalname || filePath
          });

          // If API fails, we'll allow the upload but log it as a warning
          // This ensures the platform doesn't break if Cloudmersive is down
          logger.warn('Virus scan failed - allowing upload with warning', {
            fileName: file.originalname || filePath
          });

          resolve({
            clean: true, // Assume clean if scan fails (graceful degradation)
            foundViruses: [],
            scanResult: 'SCAN_FAILED_ALLOWED',
            warning: 'Virus scan service unavailable - file allowed'
          });
        } else {
          const isClean = data.CleanResult === true;
          const foundViruses = data.FoundViruses || [];

          logger.info('Virus scan completed', {
            fileName: file.originalname || filePath,
            clean: isClean,
            foundViruses: foundViruses.length > 0 ? foundViruses : 'none'
          });

          resolve({
            clean: isClean,
            foundViruses: foundViruses,
            scanResult: isClean ? 'CLEAN' : 'INFECTED',
            fullResult: data
          });
        }
      });
    });
  } catch (error) {
    logger.error('Virus scan error', {
      error: error.message,
      fileName: file?.originalname || file
    });

    // Graceful degradation - allow upload if scan fails
    return {
      clean: true,
      foundViruses: [],
      scanResult: 'SCAN_ERROR_ALLOWED',
      warning: error.message
    };
  }
}

/**
 * Middleware to scan uploaded files for viruses
 * Use this AFTER multer middleware but BEFORE saving to Cloudinary
 * @param {string} fieldName - The name of the file field (default: 'file')
 */
function virusScanMiddleware(fieldName = 'file') {
  return async (req, res, next) => {
    try {
      // Check if file exists
      const file = req.file || req.files?.[fieldName];

      if (!file) {
        // No file uploaded, continue
        return next();
      }

      logger.info('Running virus scan on uploaded file', {
        userId: req.session?.user?.id,
        userType: req.session?.user?.type,
        fileName: file.originalname,
        fileSize: file.size
      });

      // Scan the file
      const scanResult = await scanFile(file);

      // If virus found, reject the upload
      if (!scanResult.clean) {
        logger.warn('VIRUS DETECTED - Upload blocked', {
          userId: req.session?.user?.id,
          userType: req.session?.user?.type,
          fileName: file.originalname,
          viruses: scanResult.foundViruses
        });

        // Delete the temporary file if it exists
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        return res.status(400).json({
          success: false,
          error: 'File failed security scan - malware detected',
          details: process.env.NODE_ENV === 'development' ? scanResult.foundViruses : undefined
        });
      }

      // File is clean, attach scan result to request for logging
      req.virusScanResult = scanResult;

      logger.info('File passed virus scan', {
        userId: req.session?.user?.id,
        fileName: file.originalname,
        scanResult: scanResult.scanResult
      });

      next();
    } catch (error) {
      logger.error('Virus scan middleware error', {
        error: error.message,
        userId: req.session?.user?.id
      });

      // Graceful degradation - allow upload if middleware fails
      logger.warn('Virus scan middleware failed - allowing upload', {
        userId: req.session?.user?.id
      });

      next();
    }
  };
}

/**
 * Scan a URL for viruses (for files already uploaded to Cloudinary)
 * @param {string} url - URL of the file to scan
 * @returns {Promise<Object>} - Scan result
 */
async function scanUrl(url) {
  try {
    logger.info('Starting virus scan from URL', { url });

    return new Promise((resolve, reject) => {
      apiInstance.scanWebsite(url, (error, data, response) => {
        if (error) {
          logger.error('URL virus scan error', { error: error.message, url });
          resolve({
            clean: true,
            foundViruses: [],
            scanResult: 'SCAN_FAILED_ALLOWED',
            warning: 'URL scan service unavailable'
          });
        } else {
          const isClean = data.CleanResult === true;
          const foundViruses = data.FoundViruses || [];

          logger.info('URL virus scan completed', {
            url,
            clean: isClean,
            foundViruses: foundViruses.length > 0 ? foundViruses : 'none'
          });

          resolve({
            clean: isClean,
            foundViruses: foundViruses,
            scanResult: isClean ? 'CLEAN' : 'INFECTED',
            fullResult: data
          });
        }
      });
    });
  } catch (error) {
    logger.error('URL virus scan error', { error: error.message, url });
    return {
      clean: true,
      foundViruses: [],
      scanResult: 'SCAN_ERROR_ALLOWED',
      warning: error.message
    };
  }
}

module.exports = {
  scanFile,
  scanUrl,
  virusScanMiddleware
};
