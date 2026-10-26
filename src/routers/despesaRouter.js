const express = require('express');
const despesaController = require('../controllers/despesaController');
const somenteAdmin = require('../middlewares/somenteAdmin');

const router = express.Router();

// Consultar: qualquer usuário logado. Gravar: só ADMIN.
router.get('/', despesaController.listar
  /* #swagger.summary = 'Lista as despesas'
     #swagger.description = 'Permissão: logado. mes_cobranca/ano_cobranca = mês seguinte ao da data_referencia (gasto de junho é cobrado em julho).'
     #swagger.parameters['mes'] = { in: 'query', type: 'integer', description: 'Mês da data_referencia (1 a 12)' }
     #swagger.parameters['ano'] = { in: 'query', type: 'integer', description: 'Ano da data_referencia' }
     #swagger.parameters['tipo_despesa'] = { in: 'query', type: 'string', enum: ['FIXA', 'VARIAVEL', 'OUTROS'] }
     #swagger.parameters['ativo'] = { in: 'query', type: 'boolean', description: 'true = só ativas; false = só inativas' }
     #swagger.responses[200] = { description: 'Lista de despesas', schema: { status: 'ok', data: [{ $ref: '#/definitions/Despesa' }] } } */
);
router.get('/:id', despesaController.buscarPorId
  /* #swagger.summary = 'Busca uma despesa'
     #swagger.description = 'Permissão: logado.'
     #swagger.responses[200] = { description: 'Despesa', schema: { status: 'ok', data: { $ref: '#/definitions/Despesa' } } } */
);
router.get('/:id/rateio', despesaController.previaRateio
  /* #swagger.summary = 'Prévia do rateio da despesa'
     #swagger.description = 'Permissão: logado. Não grava nada: os itens são gravados ao gerar as faturas. Divisão igual entre os apartamentos do mês (RN07); o último recebe a diferença dos centavos.'
     #swagger.responses[200] = { description: 'Rateio', schema: { status: 'ok', data: { $ref: '#/definitions/Rateio' } } } */
);
router.post('/', somenteAdmin, despesaController.criar
  /* #swagger.summary = 'Cadastra uma despesa'
     #swagger.description = 'Permissão: ADMIN. tipo_despesa = FIXA, VARIAVEL ou OUTROS. valor_m3 (preço do m³) só em despesa VARIAVEL: despesa com valor_m3 é a despesa de gás.'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/DespesaEntrada' } }
     #swagger.responses[201] = { description: 'Despesa cadastrada', schema: { status: 'ok', data: { $ref: '#/definitions/Despesa' } } } */
);
router.put('/:id', somenteAdmin, despesaController.alterar
  /* #swagger.summary = 'Altera uma despesa'
     #swagger.description = 'Permissão: ADMIN. Despesa já em fatura não cancelada ou com leituras de gás: só descricao e observacao podem mudar (409).'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/DespesaEntrada' } }
     #swagger.responses[200] = { description: 'Despesa alterada', schema: { status: 'ok', data: { $ref: '#/definitions/Despesa' } } } */
);
router.delete('/:id', somenteAdmin, despesaController.excluir
  /* #swagger.summary = 'Exclui uma despesa'
     #swagger.description = 'Permissão: ADMIN. Sem uso → exclui. Só em faturas canceladas → inativa. Em fatura não cancelada ou com leituras de gás → 409.'
     #swagger.responses[200] = { description: 'Despesa excluída ou inativada', schema: { status: 'ok', message: 'Despesa excluída.' } } */
);

module.exports = router;
