const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/transfert.controller');
const authenticateToken = require('../middlewares/auth.middleware');


router.post('/',authenticateToken, ctrl.createTransfert);
router.put('/valider/:id',authenticateToken, ctrl.validerTransfert);
router.get('/structure/:code_structure', authenticateToken, ctrl.listerParStructure);

module.exports = router;
