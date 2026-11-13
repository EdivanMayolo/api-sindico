const express = require('express');
const vinculoController = require('../controllers/vinculoController');
const somenteAdmin = require('../middlewares/somenteAdmin');

const router = express.Router();

// Consultar: qualquer usuário logado. Gravar: só ADMIN.
// Não existe DELETE: o vínculo é encerrado e fica no histórico.
router.get('/', vinculoController.listar
  /* #swagger.summary = 'Lista os vínculos'
     #swagger.description = 'Permissão: logado. Filtros opcionais.'
     #swagger.parameters['id_apartamento'] = { in: 'query', type: 'integer', description: 'Vínculos de um apartamento' }
     #swagger.parameters['id_pessoa'] = { in: 'query', type: 'integer', description: 'Vínculos de uma pessoa' }
     #swagger.parameters['ativo'] = { in: 'query', type: 'boolean', description: 'true = só ativos; false = só encerrados' }
     #swagger.responses[200] = { description: 'Lista de vínculos', schema: { status: 'ok', data: [{ $ref: '#/definitions/Vinculo' }] } } */
);
router.get('/:id', vinculoController.buscarPorId
  /* #swagger.summary = 'Busca um vínculo'
     #swagger.description = 'Permissão: logado.'
     #swagger.responses[200] = { description: 'Vínculo', schema: { status: 'ok', data: { $ref: '#/definitions/Vinculo' } } } */
);
router.post('/', somenteAdmin, vinculoController.criar
  /* #swagger.summary = 'Cria um vínculo pessoa ↔ apartamento'
     #swagger.description = 'Permissão: ADMIN. tipo_vinculo = PROPRIETARIO ou INQUILINO. reside = mora no apartamento (inquilino sempre mora). data_inicio opcional (padrão: hoje). Inquilino só em um apartamento por vez (RN03); apto inativo só recebe PROPRIETARIO; pessoa inativa não recebe vínculo. Apto com proprietário morando não recebe inquilino, e com inquilino ativo o proprietário não pode morar (409). Um único proprietário por apartamento: um novo PROPRIETARIO encerra o atual na data de início do novo (proprietario_encerrado = nome de quem saiu).'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/VinculoEntrada' } }
     #swagger.responses[201] = { description: 'Vínculo criado', schema: { status: 'ok', data: { $ref: '#/definitions/VinculoDados' } } } */
);
router.put('/:id', somenteAdmin, vinculoController.alterar
  /* #swagger.summary = 'Altera um vínculo'
     #swagger.description = 'Permissão: ADMIN. Só reside (obrigatório) e data_inicio. Vínculo encerrado não é alterado. Inquilino sempre mora (reside false → 400); proprietário não pode morar com inquilino ativo (409).'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/VinculoAlteracao' } }
     #swagger.responses[200] = { description: 'Vínculo alterado', schema: { status: 'ok', data: { $ref: '#/definitions/VinculoDados' } } } */
);
router.patch('/:id/encerrar', somenteAdmin, vinculoController.encerrar
  /* #swagger.summary = 'Encerra um vínculo'
     #swagger.description = 'Permissão: ADMIN. data_fim opcional (padrão: hoje). Não encerra o proprietário de um apartamento ativo (409): para trocar o dono, cadastre o novo proprietário.'
     #swagger.parameters['body'] = { in: 'body', schema: { $ref: '#/definitions/VinculoEncerrar' } }
     #swagger.responses[200] = { description: 'Vínculo encerrado', schema: { status: 'ok', data: { $ref: '#/definitions/VinculoDados' } } } */
);

module.exports = router;
