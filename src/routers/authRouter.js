const express = require('express');
const authController = require('../controllers/authController');
const autenticacao = require('../middlewares/autenticacao');

const router = express.Router();

// Pública: é aqui que o usuário obtém o token
router.post('/login', authController.login
  /* #swagger.summary = 'Faz o login e devolve o token'
     #swagger.description = 'Permissão: pública. O token vale 8 horas e vai no cabeçalho das outras rotas: Authorization: Bearer <token>. E-mail ou senha errados, ou usuário inativo → 401.'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/Login' } }
     #swagger.responses[200] = { description: 'Login feito', schema: { status: 'ok', data: { $ref: '#/definitions/LoginResposta' } } } */
);

// Precisam de login
router.get('/me', autenticacao, authController.meusDados
  /* #swagger.summary = 'Dados do usuário logado'
     #swagger.description = 'Permissão: logado.'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Usuário logado', schema: { status: 'ok', data: { $ref: '#/definitions/Usuario' } } } */
);
router.patch('/senha', autenticacao, authController.alterarMinhaSenha
  /* #swagger.summary = 'Troca a própria senha'
     #swagger.description = 'Permissão: logado. Exige a senha atual; a nova precisa ter no mínimo 6 caracteres.'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/AlterarMinhaSenha' } }
     #swagger.responses[200] = { description: 'Senha alterada', schema: { status: 'ok', message: 'Senha alterada com sucesso.' } } */
);

module.exports = router;
