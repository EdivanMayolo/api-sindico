const express = require('express');
const pessoaController = require('../controllers/pessoaController');
const somenteAdmin = require('../middlewares/somenteAdmin');

const router = express.Router();

// Consultar: qualquer usuário logado. Gravar: só ADMIN.
router.get('/', pessoaController.listar
  /* #swagger.summary = 'Lista as pessoas'
     #swagger.description = 'Permissão: logado.'
     #swagger.parameters['ativo'] = { in: 'query', type: 'boolean', description: 'true = só ativas; false = só inativas' }
     #swagger.responses[200] = { description: 'Lista de pessoas', schema: { status: 'ok', data: [{ $ref: '#/definitions/Pessoa' }] } } */
);
router.get('/:id', pessoaController.buscarPorId
  /* #swagger.summary = 'Busca uma pessoa'
     #swagger.description = 'Permissão: logado. Traz os vínculos ativos com apartamentos.'
     #swagger.responses[200] = { description: 'Pessoa', schema: { status: 'ok', data: { $ref: '#/definitions/PessoaDetalhe' } } } */
);
router.post('/', somenteAdmin, pessoaController.criar
  /* #swagger.summary = 'Cadastra uma pessoa'
     #swagger.description = 'Permissão: ADMIN. Nome, CPF e telefone obrigatórios. O CPF pode vir com máscara: é gravado só com os 11 números e validado (CPF inválido → 400; repetido → 409).'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/PessoaEntrada' } }
     #swagger.responses[201] = { description: 'Pessoa cadastrada', schema: { status: 'ok', data: { $ref: '#/definitions/Pessoa' } } } */
);
router.put('/:id', somenteAdmin, pessoaController.alterar
  /* #swagger.summary = 'Altera uma pessoa'
     #swagger.description = 'Permissão: ADMIN. ativo = false inativa a pessoa (bloqueado se tiver vínculo ativo → 409).'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/PessoaAlteracao' } }
     #swagger.responses[200] = { description: 'Pessoa alterada', schema: { status: 'ok', data: { $ref: '#/definitions/Pessoa' } } } */
);
router.delete('/:id', somenteAdmin, pessoaController.excluir
  /* #swagger.summary = 'Exclui uma pessoa'
     #swagger.description = 'Permissão: ADMIN. Sem histórico → exclui. Com histórico de vínculos → apenas inativa. Com vínculo ativo → 409.'
     #swagger.responses[200] = { description: 'Pessoa excluída ou inativada', schema: { status: 'ok', message: 'Pessoa excluída.' } } */
);

module.exports = router;
