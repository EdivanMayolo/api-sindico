const express = require('express');
const usuarioController = require('../controllers/usuarioController');

const router = express.Router();

// Todas exigem login de ADMIN (definido em routers/index.js).
// Não existe exclusão: para bloquear o acesso, alterar com ativo = false.
router.get('/', usuarioController.listar);
router.get('/:id', usuarioController.buscarPorId);
router.post('/', usuarioController.criar);
router.put('/:id', usuarioController.alterar);
router.patch('/:id/senha', usuarioController.alterarSenha);

module.exports = router;
