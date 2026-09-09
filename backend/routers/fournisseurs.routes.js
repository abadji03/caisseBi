const express = require('express');
const router = express.Router();
const fournisseurCtrl = require('../controllers/fournisseur.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission, requireStructureAccess } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Fournisseurs
 *   description: Gestion des fournisseurs
 *
 * /fournisseurs:
 *   post:
 *     summary: Créer un fournisseur
 *     tags: [Fournisseurs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nomComplet, code_structure]
 *             properties:
 *               nomComplet: { type: string }
 *               telephone: { type: string }
 *               email: { type: string }
 *               adresse: { type: string }
 *               banque: { type: string }
 *               numeroCompte: { type: string }
 *               code_structure: { type: string }
 *     responses:
 *       201:
 *         description: Fournisseur créé
 *
 * /fournisseurs/structure/{code_structure}:
 *   get:
 *     summary: Lister les fournisseurs d'une structure
 *     tags: [Fournisseurs]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des fournisseurs
 *
 * /fournisseurs/{id}:
 *   get:
 *     summary: Récupérer un fournisseur par ID
 *     tags: [Fournisseurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Fournisseur trouvé
 *   put:
 *     summary: Mettre à jour un fournisseur
 *     tags: [Fournisseurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Fournisseur mis à jour
 *   delete:
 *     summary: Supprimer un fournisseur
 *     tags: [Fournisseurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Fournisseur supprimé
 */


router.post('/', authenticateToken, requireStructureAccess, requirePermission('suppliers.manage'), fournisseurCtrl.createFournisseur);
router.put('/:id', authenticateToken, requireStructureAccess, requirePermission('suppliers.manage'), fournisseurCtrl.updateFournisseur);
router.delete('/:id', authenticateToken, requireStructureAccess, requirePermission('suppliers.manage'), fournisseurCtrl.deleteFournisseur);
router.get('/structure/:code_structure', authenticateToken, requireStructureAccess, requirePermission('suppliers.manage'), fournisseurCtrl.getFournisseursByStructure);
router.get('/structure/bis/:code_structure', authenticateToken, requireStructureAccess, requirePermission('suppliers.manage'), fournisseurCtrl.getFournisseursByStructureBis);
router.patch('/:id/statut', authenticateToken, requireStructureAccess, requirePermission('suppliers.manage'), fournisseurCtrl.updateFournisseurStatus);
router.get('/:id', authenticateToken, requireStructureAccess, requirePermission('suppliers.manage'), fournisseurCtrl.getFournisseurById);
router.get('/:code_structure/:id/bons', authenticateToken, requireStructureAccess, requirePermission('suppliers.manage'), fournisseurCtrl.getBonsWithPaniersAndProduits);

router.get('/:id/with-magasins',authenticateToken, requireStructureAccess, requirePermission('suppliers.manage'), fournisseurCtrl.getFournisseurWithMagasins);

// Routes pour fournisseurs
router.put('/fournisseurs/:fournisseurId/magasins/:magasinId/solde', fournisseurCtrl.updateFournisseurSoldeByMagasin);

router.get('/export/excel',authenticateToken, requireStructureAccess, requirePermission('suppliers.manage'), fournisseurCtrl.exportFournisseursExcel);
module.exports = router;
