const express = require('express');
const usuarioController = require('../controllers/usuarioController');

const router = express.Router();

// Todas exigem login de ADMIN (definido em routers/index.js).
// Não existe exclusão: para bloquear o acesso, alterar com ativo = false.
router.get('/', usuarioController.listar
  /* #swagger.summary = 'Lista os usuários'
     #swagger.description = 'Permissão: ADMIN.'
     #swagger.responses[200] = { description: 'Lista de usuários', schema: { status: 'ok', data: [{ $ref: '#/definitions/Usuario' }] } } */
);
router.get('/:id', usuarioController.buscarPorId
  /* #swagger.summary = 'Busca um usuário'
     #swagger.description = 'Permissão: ADMIN.'
     #swagger.responses[200] = { description: 'Usuário', schema: { status: 'ok', data: { $ref: '#/definitions/Usuario' } } } */
);
router.post('/', usuarioController.criar
  /* #swagger.summary = 'Cadastra um usuário'
     #swagger.description = 'Permissão: ADMIN. perfil = ADMIN ou COMUM. Senha com no mínimo 6 caracteres (gravada só em hash). E-mail gravado em minúsculas e único.'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/UsuarioEntrada' } }
     #swagger.responses[201] = { description: 'Usuário cadastrado', schema: { status: 'ok', data: { $ref: '#/definitions/Usuario' } } } */
);
router.put('/:id', usuarioController.alterar
  /* #swagger.summary = 'Altera um usuário'
     #swagger.description = 'Permissão: ADMIN. ativo = false bloqueia o acesso (usuário não é excluído). O ADMIN não pode tirar o próprio perfil ADMIN nem se inativar.'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/UsuarioAlteracao' } }
     #swagger.responses[200] = { description: 'Usuário alterado', schema: { status: 'ok', data: { $ref: '#/definitions/Usuario' } } } */
);
router.patch('/:id/senha', usuarioController.alterarSenha
  /* #swagger.summary = 'Redefine a senha de um usuário'
     #swagger.description = 'Permissão: ADMIN. Não pede a senha atual (uso: usuário esqueceu a senha).'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/NovaSenha' } }
     #swagger.responses[200] = { description: 'Senha alterada', schema: { status: 'ok', message: 'Senha alterada com sucesso.' } } */
);

module.exports = router;
