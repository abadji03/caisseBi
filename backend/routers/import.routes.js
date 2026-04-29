// routes/import.routes.js
const router = require('express').Router();
const importController = require('../controllers/import.controller');
const authenticateToken = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.post('/detecter', importController.uploadMiddleware, importController.detecterStructure);
router.post('/', importController.uploadMiddleware, importController.importer);

module.exports = router;