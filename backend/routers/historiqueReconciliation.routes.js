/* const express = require("express");
const router = express.Router();
const authenticateToken = require('../middlewares/auth.middleware');
const { requireStructureAccess } = require('../middlewares/auth.middleware');
const ctrl = require("../controllers/historiqueReconciliation.controller");

router.post("/", ctrl.create);
router.get("/reconciliation/:reconciliationId", ctrl.findByReconciliation);

module.exports = router;
 */

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth.middleware');
const { requireStructureAccess } = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/historiqueReconciliation.controller');

/**
 * @swagger
 * tags:
 *   name: Historique Réconciliation
 *   description: Historique des opérations de réconciliation
 *
 * /historiques-reconciliations/reconciliation/{reconciliationId}:
 *   get:
 *     summary: Historique d'une réconciliation
 *     tags: [Historique Réconciliation]
 *     parameters:
 *       - in: path
 *         name: reconciliationId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Historique de la réconciliation
 *
 * /historiques-reconciliations/structure/{code_structure}:
 *   get:
 *     summary: Historiques d'une structure
 *     tags: [Historique Réconciliation]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des historiques
 */
router.get('/reconciliation/:reconciliationId', ctrl.findByReconciliation);
router.get('/structure/:code_structure', authenticateToken, requireStructureAccess, ctrl.findByStructure);
router.get('/:id', ctrl.findById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
