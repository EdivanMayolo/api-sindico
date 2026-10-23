const express = require('express');
const faturaController = require('../controllers/faturaController');
const somenteAdmin = require('../middlewares/somenteAdmin');

const router = express.Router();

// Consultar: qualquer usuário logado. Gerar e mexer em itens: só ADMIN.
router.get('/', faturaController.listar);
router.get('/:id', faturaController.buscarPorId);
router.post('/gerar', somenteAdmin, faturaController.gerar);
router.post('/:id/itens', somenteAdmin, faturaController.adicionarItem);
router.delete('/:id/itens/:id_item', somenteAdmin, faturaController.removerItem);

// STATUS DA FATURA — DESATIVADO (decisões 5A/6A: trabalho futuro).
// Para ativar, descomentar:
// router.patch('/:id/status', somenteAdmin, faturaController.alterarStatus);

module.exports = router;
