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
    const { typeImport, updateExisting = 'false', hasHeader = 'true', mapping } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    // Types d'import disponibles (les autres ne sont pas encore implémentés)
    const TYPES_IMPLÉMENTES = [
      'structures', 'magasins', 'clients', 'fournisseurs',
      'categories', 'produits', 'stocks'
    ];
    const TYPES_NON_IMPLÉMENTES = ['bons', 'paiements', 'factures', 'complet'];

    if (!typeImport) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Le paramètre typeImport est requis' });
    }

    if (TYPES_NON_IMPLÉMENTES.includes(typeImport)) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(422).json({
        message: `L'import de type "${typeImport}" n'est pas encore disponible.`,
        typesDisponibles: TYPES_IMPLÉMENTES
      });
    }

    if (!TYPES_IMPLÉMENTES.includes(typeImport)) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        message: `Type d'import inconnu: "${typeImport}". Types disponibles: ${TYPES_IMPLÉMENTES.join(', ')}`,
        typesDisponibles: TYPES_IMPLÉMENTES
      });
    }

    // Parser le mapping JSON envoyé par le frontend
    let mappingObjet = {};
    if (mapping) {
      try {
        mappingObjet = typeof mapping === 'string' ? JSON.parse(mapping) : mapping;
      } catch {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Le paramètre mapping est invalide (JSON malformé)' });
      }
    }
    
    const results = await importService.importerFichier(
      req.file.path,
      typeImport,
      authUser.code_structure,
      authUser.id,
      {
        updateExisting: updateExisting === 'true',
        hasHeader: hasHeader === 'true',
        mapping: mappingObjet
      }
    );
    
    res.json({
      success: true,
      message: `Import terminé: ${results.importes} éléments importés, ${results.erreurs.length} erreurs`,
      results: {
        ...results,
        // Expose le compte sous forme de nombre pour la compatibilité frontend
        nombreErreurs: results.erreurs.length
      }
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

    // Lire hasHeader depuis le body (par défaut true si absent)
    const hasHeader = req.body.hasHeader !== 'false';

    const data = await importService.parserFichier(req.file.path, hasHeader);
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