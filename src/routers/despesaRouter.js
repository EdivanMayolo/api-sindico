const express = require('express');
const despesaController = require('../controllers/despesaController');
const somenteAdmin = require('../middlewares/somenteAdmin');

const router = express.Router();

// Consultar: qualquer usuário logado. Gravar: só ADMIN.
router.get('/', despesaController.listar);
router.get('/:id', despesaController.buscarPorId);
router.get('/:id/rateio', despesaController.previaRateio);
router.post('/', somenteAdmin, despesaController.criar);
router.put('/:id', somenteAdmin, despesaController.alterar);
router.delete('/:id', somenteAdmin, despesaController.excluir);

module.exports = router;
