const express = require('express');
const authController = require('../controllers/authController');
const autenticacao = require('../middlewares/autenticacao');

const router = express.Router();

// Pública: é aqui que o usuário obtém o token
router.post('/login', authController.login);

// Precisam de login
router.get('/me', autenticacao, authController.meusDados);
router.patch('/senha', autenticacao, authController.alterarMinhaSenha);

module.exports = router;
