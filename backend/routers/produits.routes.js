const express = require('express');
const router = express.Router();
const produitCtrl = require('../controllers/produit.controller');
const upload = require('../middlewares/uploadMiddleware');
const authenticateToken = require('../middlewares/auth.middleware');


router.post('/',authenticateToken, upload.single('image'), produitCtrl.createProduit);
router.put('/:id',authenticateToken, upload.single('image'), produitCtrl.updateProduit);
router.delete('/:id',authenticateToken, produitCtrl.deleteProduit);
router.get('/structure/:code_structure',authenticateToken, produitCtrl.getProduitsByStructure);
router.get('/structure/:code_structure/produits-disponibles',authenticateToken, produitCtrl.getProduitsDisponibles);
router.get('/:id', authenticateToken, produitCtrl.getProduitById);
//router.get('/', authenticateToken, produitCtrl.getAllProduits);
router.patch('/:id/statut', authenticateToken, produitCtrl.updateStatusProduit);
router.patch('/:id/tauxTVA', authenticateToken, produitCtrl.updateTauxTVAProduit);
router.patch('/:id/image', authenticateToken, upload.single('image'), produitCtrl.updateImageProduit);
router.put('/:id/code-barre', authenticateToken, produitCtrl.updateCodeBarreProduit);

// Route pour exporter les produits vers Excel
router.get(
  '/export/excel/structure/:code_structure',
  authenticateToken,
  produitCtrl.exportProduitsToExcel
);

// Route pour exporter vers pdf
router.get(
  '/export-pdf/structure/:code_structure',
  authenticateToken,
  produitCtrl.exportProduitsToPDF
);

module.exports = router;
