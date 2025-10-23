// routes/articlePanierRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/articlePanier.controller');

router.post('/', controller.create);
router.get('/', controller.findAll);
router.get('/:id', controller.findById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
//Récupérer les aticles de panier d’une structure
router.get('/structure/:code_structure', controller.getArticlesPanierByStructure);
router.post('/batch', controller.createBatch);
// Supprimer un article d’un panier donné
router.delete('/panier/:panierId/produit/:produitId', controller.deleteArticleFromPanier);



module.exports = router;
