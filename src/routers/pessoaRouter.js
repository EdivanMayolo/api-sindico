const express = require('express');
const pessoaController = require('../controllers/pessoaController');
const somenteAdmin = require('../middlewares/somenteAdmin');

const router = express.Router();

// Consultar: qualquer usuário logado. Gravar: só ADMIN.
router.get('/', pessoaController.listar);
router.get('/:id', pessoaController.buscarPorId);
router.post('/', somenteAdmin, pessoaController.criar);
router.put('/:id', somenteAdmin, pessoaController.alterar);
router.delete('/:id', somenteAdmin, pessoaController.excluir);

module.exports = router;
