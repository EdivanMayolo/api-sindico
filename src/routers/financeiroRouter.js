const express = require('express');
const financeiroController = require('../controllers/financeiroController');

const router = express.Router();

// Só consultas (qualquer usuário logado): vêm das views do banco
router.get('/movimentacao', financeiroController.movimentacao);
router.get('/saldo', financeiroController.saldo);

module.exports = router;
