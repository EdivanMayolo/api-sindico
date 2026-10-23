const express = require('express');
const receitaController = require('../controllers/receitaController');
const somenteAdmin = require('../middlewares/somenteAdmin');

const router = express.Router();

// Consultar: qualquer usuário logado. Lançar, alterar e excluir: só ADMIN.
router.get('/', receitaController.listar);
router.get('/:id', receitaController.buscarPorId);
router.post('/', somenteAdmin, receitaController.criar);
router.put('/:id', somenteAdmin, receitaController.alterar);
router.delete('/:id', somenteAdmin, receitaController.excluir);

module.exports = router;
