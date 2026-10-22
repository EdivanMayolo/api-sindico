const express = require('express');
const leituraGasController = require('../controllers/leituraGasController');
const somenteAdmin = require('../middlewares/somenteAdmin');

const router = express.Router();

// Consultar: qualquer usuário logado. Lançar, corrigir, finalizar e excluir: só ADMIN.
router.get('/despesa/:id_despesa', leituraGasController.painel);
router.get('/:id', leituraGasController.buscarPorId);
router.post('/', somenteAdmin, leituraGasController.criar);
router.put('/:id', somenteAdmin, leituraGasController.alterar);
router.patch('/:id/finalizar', somenteAdmin, leituraGasController.finalizar);
router.delete('/:id', somenteAdmin, leituraGasController.excluir);

module.exports = router;
