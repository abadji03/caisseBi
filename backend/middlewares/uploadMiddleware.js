// middlewares/uploadMiddleware.js
const multer = require('multer');
const path = require('path');

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Le dossier où les fichiers seront stockés
  },
  filename: (req, file, cb) => {
    // Renommer le fichier avec la date pour éviter les conflits
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // ex: 123456.png
  }
});

// Filtre de type de fichier (images uniquement)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) cb(null, true);
  else cb(new Error('Seuls les fichiers image sont autorisés.'));
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
