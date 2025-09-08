const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/depense.controller');

router.post('/', ctrl.createDepense);
router.get('/magasin/:magasinId', ctrl.getAllByMagasin);
router.delete('/:id', ctrl.deleteDepense);

module.exports = router;
