const express = require('express');
const apartamentoController = require('../controllers/apartamentoController');
const somenteAdmin = require('../middlewares/somenteAdmin');

const router = express.Router();

// Consultar: qualquer usuário logado. Gravar: só ADMIN.
// RN01: não existe DELETE — o apartamento é só inativado.
router.get('/', apartamentoController.listar
  /* #swagger.summary = 'Lista os apartamentos'
     #swagger.description = 'Permissão: logado. Traz os nomes dos proprietários e dos moradores de cada apartamento.'
     #swagger.parameters['ativo'] = { in: 'query', type: 'boolean', description: 'true = só ativos; false = só inativos' }
     #swagger.responses[200] = { description: 'Lista de apartamentos', schema: { status: 'ok', data: [{ $ref: '#/definitions/Apartamento' }] } } */
);
// REGRA DOS 5 DIAS — DESATIVADA. Para ativar, descomentar (precisa ficar antes do /:id):
// router.get('/periodo-cadastro', apartamentoController.periodoCadastro);
router.get('/:id', apartamentoController.buscarPorId
  /* #swagger.summary = 'Busca um apartamento'
     #swagger.description = 'Permissão: logado. Traz os vínculos ativos (proprietários e inquilinos).'
     #swagger.responses[200] = { description: 'Apartamento', schema: { status: 'ok', data: { $ref: '#/definitions/ApartamentoDetalhe' } } } */
);
router.post('/', somenteAdmin, apartamentoController.criar
  /* #swagger.summary = 'Cadastra um apartamento'
     #swagger.description = 'Permissão: ADMIN. Exige o proprietário (id_pessoa_proprietario): o apartamento e o vínculo de PROPRIETARIO são gravados juntos. reside = o proprietário mora no apto. (numero, bloco) não se repete. data_cadastro = data do dia.'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/ApartamentoEntrada' } }
     #swagger.responses[201] = { description: 'Apartamento cadastrado', schema: { status: 'ok', data: { $ref: '#/definitions/ApartamentoCriado' } } } */
);
router.put('/:id', somenteAdmin, apartamentoController.alterar
  /* #swagger.summary = 'Altera um apartamento'
     #swagger.description = 'Permissão: ADMIN. Altera número, bloco e andar. Proprietários e moradores são alterados pelos vínculos.'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/ApartamentoAlteracao' } }
     #swagger.responses[200] = { description: 'Apartamento alterado', schema: { status: 'ok', data: { $ref: '#/definitions/ApartamentoDados' } } } */
);
router.patch('/:id/inativar', somenteAdmin, apartamentoController.inativar
  /* #swagger.summary = 'Inativa um apartamento'
     #swagger.description = 'Permissão: ADMIN. Apartamento não é excluído (RN01). Bloqueado se tiver inquilino ativo (409); o proprietário continua dono.'
     #swagger.responses[200] = { description: 'Apartamento inativado', schema: { status: 'ok', data: { $ref: '#/definitions/ApartamentoDados' } } } */
);
router.patch('/:id/ativar', somenteAdmin, apartamentoController.ativar
  /* #swagger.summary = 'Reativa um apartamento'
     #swagger.description = 'Permissão: ADMIN. Exige um proprietário ativo (409 se não tiver).'
     #swagger.responses[200] = { description: 'Apartamento reativado', schema: { status: 'ok', data: { $ref: '#/definitions/ApartamentoDados' } } } */
);

module.exports = router;
