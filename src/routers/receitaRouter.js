const express = require('express');
const receitaController = require('../controllers/receitaController');
const somenteAdmin = require('../middlewares/somenteAdmin');

const router = express.Router();

// Consultar: qualquer usuário logado. Lançar, alterar e excluir: só ADMIN.
router.get('/', receitaController.listar
  /* #swagger.summary = 'Lista as receitas'
     #swagger.description = 'Permissão: logado.'
     #swagger.parameters['mes'] = { in: 'query', type: 'integer', description: 'Mês da data_recebimento (1 a 12)' }
     #swagger.parameters['ano'] = { in: 'query', type: 'integer', description: 'Ano da data_recebimento' }
     #swagger.responses[200] = { description: 'Lista de receitas', schema: { status: 'ok', data: [{ $ref: '#/definitions/Receita' }] } } */
);
router.get('/:id', receitaController.buscarPorId
  /* #swagger.summary = 'Busca uma receita'
     #swagger.description = 'Permissão: logado.'
     #swagger.responses[200] = { description: 'Receita', schema: { status: 'ok', data: { $ref: '#/definitions/Receita' } } } */
);
router.post('/', somenteAdmin, receitaController.criar
  /* #swagger.summary = 'Lança uma receita'
     #swagger.description = 'Permissão: ADMIN. descricao e valor (maior que zero) obrigatórios. data_recebimento opcional (padrão: hoje). O pagamento de fatura é lançado aqui, à mão.'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/ReceitaEntrada' } }
     #swagger.responses[201] = { description: 'Receita lançada', schema: { status: 'ok', data: { $ref: '#/definitions/Receita' } } } */
);
router.put('/:id', somenteAdmin, receitaController.alterar
  /* #swagger.summary = 'Altera uma receita'
     #swagger.description = 'Permissão: ADMIN. Sem data_recebimento, mantém a data atual.'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/ReceitaEntrada' } }
     #swagger.responses[200] = { description: 'Receita alterada', schema: { status: 'ok', data: { $ref: '#/definitions/Receita' } } } */
);
router.delete('/:id', somenteAdmin, receitaController.excluir
  /* #swagger.summary = 'Exclui uma receita'
     #swagger.description = 'Permissão: ADMIN. Exclui de verdade; o saldo se ajusta sozinho.'
     #swagger.responses[200] = { description: 'Receita excluída', schema: { status: 'ok', message: 'Receita excluída.' } } */
);

module.exports = router;
