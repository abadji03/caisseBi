const express = require('express');
const router = express.Router();
const magasinCtrl = require('../controllers/magasin.controller');
const authenticateToken = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Magasins
 *   description: Gestion des magasins / points de vente
 *
 * /magasins:
 *   post:
 *     summary: Créer un magasin
 *     tags: [Magasins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, code_structure]
 *             properties:
 *               nom: { type: string }
 *               adresse: { type: string }
 *               telephone: { type: string }
 *               email: { type: string }
 *               code_structure: { type: string }
 *     responses:
 *       201:
 *         description: Magasin créé
 *   get:
 *     summary: Lister tous les magasins
 *     tags: [Magasins]
 *     responses:
 *       200:
 *         description: Liste des magasins
 *
 * /magasins/structure/{code_structure}:
 *   get:
 *     summary: Magasins d'une structure
 *     tags: [Magasins]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des magasins de la structure
 *
 * /magasins/{id}:
 *   get:
 *     summary: Récupérer un magasin par ID
 *     tags: [Magasins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Magasin trouvé
 *   put:
 *     summary: Mettre à jour un magasin
 *     tags: [Magasins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Magasin mis à jour
 *   delete:
 *     summary: Supprimer un magasin
 *     tags: [Magasins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Magasin supprimé
 */


router.post('/', authenticateToken, magasinCtrl.createMagasin);
router.put('/:id', authenticateToken, magasinCtrl.updateMagasin);
router.delete('/:id', authenticateToken, magasinCtrl.deleteMagasin);
router.get('/structure/:code_structure', authenticateToken, magasinCtrl.getMagasinsByStructure);
router.get('/structure/bis/:code_structure', authenticateToken, magasinCtrl.getMagasinsByStructureBis);
router.get('/', authenticateToken, magasinCtrl.getAllMagasins);
router.patch('/:id/statut', authenticateToken, magasinCtrl.updateStatutMagasin);
router.get('/:id', authenticateToken, magasinCtrl.getMagasinById);

module.exports = router;
