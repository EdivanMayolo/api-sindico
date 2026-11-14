const express = require('express');
const faturaController = require('../controllers/faturaController');
const somenteAdmin = require('../middlewares/somenteAdmin');

const router = express.Router();

// Consultar: qualquer usuário logado. Gerar e mexer em itens: só ADMIN.
router.get('/', faturaController.listar
  /* #swagger.summary = 'Lista as faturas'
     #swagger.description = 'Permissão: logado. Consulta por apartamento, mês e ano (RF17). mes/ano = mês dos gastos (fatura de 06/2026 é cobrada em julho).'
     #swagger.parameters['id_apartamento'] = { in: 'query', type: 'integer' }
     #swagger.parameters['mes'] = { in: 'query', type: 'integer', description: 'Mês de referência (1 a 12)' }
     #swagger.parameters['ano'] = { in: 'query', type: 'integer', description: 'Ano de referência' }
     #swagger.parameters['status'] = { in: 'query', type: 'string', enum: ['ABERTA', 'EMITIDA', 'PAGA', 'CANCELADA'] }
     #swagger.responses[200] = { description: 'Lista de faturas', schema: { status: 'ok', data: [{ $ref: '#/definitions/Fatura' }] } } */
);
router.get('/:id', faturaController.buscarPorId
  /* #swagger.summary = 'Busca uma fatura com os itens'
     #swagger.description = 'Permissão: logado. avulso = item lançado à mão (sem despesa).'
     #swagger.responses[200] = { description: 'Fatura', schema: { status: 'ok', data: { $ref: '#/definitions/FaturaDetalhe' } } } */
);
router.post('/gerar', somenteAdmin, faturaController.gerar
  /* #swagger.summary = 'Gera as faturas do mês'
     #swagger.description = 'Permissão: ADMIN. Gera de uma vez a fatura de todos os apartamentos do mês, só a partir do 1º dia do mês seguinte. Entram as despesas pendentes até o fim do mês (rateio igual) e o gás (um item por leitura finalizada). Mês já gerado → 409. Leituras de gás incompletas → 409. Na mesma transação, as despesas FIXA ativas do mês são lançadas no mês seguinte (mesmo dia e valor; não duplica a mesma descrição).'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/GerarFaturas' } }
     #swagger.responses[201] = { description: 'Faturas geradas', schema: { status: 'ok', data: [{ $ref: '#/definitions/Fatura' }] } } */
);
router.post('/:id/itens', somenteAdmin, faturaController.adicionarItem
  /* #swagger.summary = 'Inclui um item avulso na fatura'
     #swagger.description = 'Permissão: ADMIN. Ex.: multa, taxa extra. Só em fatura ABERTA. O total da fatura é recalculado pelo banco.'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/ItemAvulso' } }
     #swagger.responses[201] = { description: 'Item incluído (devolve a fatura)', schema: { status: 'ok', data: { $ref: '#/definitions/FaturaDetalhe' } } } */
);
router.delete('/:id/itens/:id_item', somenteAdmin, faturaController.removerItem
  /* #swagger.summary = 'Remove um item avulso da fatura'
     #swagger.description = 'Permissão: ADMIN. Só item avulso e só em fatura ABERTA (itens de despesa fazem parte do rateio → 409).'
     #swagger.responses[200] = { description: 'Item removido (devolve a fatura)', schema: { status: 'ok', data: { $ref: '#/definitions/FaturaDetalhe' } } } */
);

// STATUS DA FATURA — DESATIVADO (decisões 5A/6A: trabalho futuro).
// Para ativar, descomentar:
// router.patch('/:id/status', somenteAdmin, faturaController.alterarStatus);

module.exports = router;
