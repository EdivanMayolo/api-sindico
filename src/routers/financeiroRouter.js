const express = require('express');
const financeiroController = require('../controllers/financeiroController');

const router = express.Router();

// Só consultas (qualquer usuário logado): vêm das views do banco
router.get('/movimentacao', financeiroController.movimentacao
  /* #swagger.summary = 'Movimentação financeira (extrato)'
     #swagger.description = 'Permissão: logado. Receitas (ENTRADA) e despesas ativas (SAIDA), em ordem de data. A despesa de gás entra pelo valor da conta.'
     #swagger.parameters['data_inicio'] = { in: 'query', type: 'string', format: 'date', description: 'AAAA-MM-DD' }
     #swagger.parameters['data_fim'] = { in: 'query', type: 'string', format: 'date', description: 'AAAA-MM-DD' }
     #swagger.parameters['tipo'] = { in: 'query', type: 'string', enum: ['ENTRADA', 'SAIDA'] }
     #swagger.responses[200] = { description: 'Lançamentos', schema: { status: 'ok', data: [{ $ref: '#/definitions/Movimentacao' }] } } */
);
router.get('/saldo', financeiroController.saldo
  /* #swagger.summary = 'Saldo do caixa'
     #swagger.description = 'Permissão: logado. Sem datas: saldo geral (total_receitas, total_despesas, saldo). Com data_inicio e/ou data_fim: saldo_anterior, entradas, saidas, saldo_periodo e saldo_final (ver exemplo SaldoPeriodo em Models).'
     #swagger.parameters['data_inicio'] = { in: 'query', type: 'string', format: 'date', description: 'AAAA-MM-DD' }
     #swagger.parameters['data_fim'] = { in: 'query', type: 'string', format: 'date', description: 'AAAA-MM-DD' }
     #swagger.responses[200] = { description: 'Saldo geral (sem datas)', schema: { status: 'ok', data: { $ref: '#/definitions/Saldo' } } } */
);

module.exports = router;
