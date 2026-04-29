// controllers/import.controller.js
const importService = require('../services/import.service');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/imports';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls', '.json'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

exports.uploadMiddleware = upload.single('fichier');

exports.importer = async (req, res) => {
  try {
    const authUser = req.user;
    const { typeImport, updateExisting = 'false', hasHeader = 'true' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }
    
    const results = await importService.importerFichier(
      req.file.path,
      typeImport,
      authUser.code_structure,
      authUser.id,
      {
        updateExisting: updateExisting === 'true',
        hasHeader: hasHeader === 'true'
      }
    );
    
    res.json({
      success: true,
      message: `Import terminé: ${results.importes} éléments importés, ${results.erreurs.length} erreurs`,
      results
    });
    
  } catch (error) {
    console.error('Erreur import:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.detecterStructure = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }
    
    const data = await importService.parserFichier(req.file.path, true);
    const entetes = data.length > 0 ? Object.keys(data[0]) : [];
    const apercu = data.slice(0, 5);
    
    fs.unlinkSync(req.file.path);
    
    res.json({
      entetes,
      apercu,
      totalLignes: data.length,
      typeDetecte: detecterTypeFichier(entetes)
    });
    
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: error.message });
  }
};

function detecterTypeFichier(entetes) {
  const entetesLower = entetes.map(e => e.toLowerCase());
  
  if (entetesLower.some(e => ['nom complet', 'fullname', 'client'].includes(e))) return 'clients';
  if (entetesLower.some(e => ['designation', 'produit', 'reference'].includes(e))) return 'produits';
  if (entetesLower.some(e => ['fournisseur', 'supplier'].includes(e))) return 'fournisseurs';
  if (entetesLower.some(e => ['magasin', 'store'].includes(e))) return 'magasins';
  
  return 'autre';
}