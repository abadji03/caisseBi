const express = require('express');
const router = express.Router();
const clientCtrl = require('../controllers/client.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Clients
 *   description: Gestion des clients
 */

/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Créer un client
 *     tags: [Clients]
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
 *               plafond: { type: number }
 *               code_structure: { type: string }
 *     responses:
 *       201:
 *         description: Client créé
 *
 * /clients/structure/{code_structure}:
 *   get:
 *     summary: Lister les clients d'une structure
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des clients
 *
 * /clients/{id}:
 *   get:
 *     summary: Récupérer un client par ID
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Client trouvé
 *   put:
 *     summary: Mettre à jour un client
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Client mis à jour
 *   delete:
 *     summary: Supprimer un client
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Client supprimé
 */

router.get('/:id', authenticateToken, requirePermission('Gérer les clients'), clientCtrl.getClientById);
router.get('/structure/:code_structure', authenticateToken, requirePermission('Gérer les clients'), clientCtrl.getClientsByStructure);
router.get('/structure/bis/:code_structure', authenticateToken, requirePermission('Gérer les clients'), clientCtrl.getClientsByStructureBis);
router.post('/', authenticateToken, requirePermission('Gérer les clients'), clientCtrl.createClient);
router.put('/:id', authenticateToken, requirePermission('Gérer les clients'), clientCtrl.updateClient);
router.delete('/:id', authenticateToken, requirePermission('Gérer les clients'), clientCtrl.deleteClient);      
// Routes spécifiques
router.patch('/:id/statut', authenticateToken, requirePermission('Gérer les clients'), clientCtrl.updateClientStatut);

//router.patch('/:id/solde', authenticateToken, requirePermission('Gérer les clients'), clientCtrl.updateClientSolde);
// Routes pour clients
router.put('/clients/:clientId/magasins/:magasinId/solde', clientCtrl.updateClientSolde);

router.patch('/:id/plafond', authenticateToken, requirePermission('Gérer les clients'), clientCtrl.updateClientPlafond);
router.patch('/:id/montant-a-payer', authenticateToken, requirePermission('Gérer les clients'), clientCtrl.updateMontantANousPayer);

// Dans votre fichier de routes
router.get('/clients/:id/with-magasins',authenticateToken, requirePermission('Gérer les clients'), clientCtrl.getClientWithMagasins);

router.get('/export/excel',authenticateToken, requirePermission('Gérer les clients'), clientCtrl.exportClientsExcel);

router.post('/create-associate-client', authenticateToken, requirePermission('Gérer les clients'), clientCtrl.createOrAssociateClient);

module.exports = router;
