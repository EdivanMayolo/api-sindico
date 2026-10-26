const express = require('express');
const leituraGasController = require('../controllers/leituraGasController');
const somenteAdmin = require('../middlewares/somenteAdmin');

const router = express.Router();

// Consultar: qualquer usuário logado. Lançar, corrigir, finalizar e excluir: só ADMIN.
router.get('/despesa/:id_despesa', leituraGasController.painel
  /* #swagger.summary = 'Painel de leitura de uma despesa de gás'
     #swagger.description = 'Permissão: logado. Aptos do mês em ordem (bloco, número) com a situação (PENDENTE, EM_ANDAMENTO, FINALIZADA), a leitura do mês e a última leitura finalizada. completa = todas finalizadas. diferenca = conta − consumo dos aptos (não é cobrada).'
     #swagger.responses[200] = { description: 'Painel', schema: { status: 'ok', data: { $ref: '#/definitions/PainelGas' } } } */
);
router.get('/:id', leituraGasController.buscarPorId
  /* #swagger.summary = 'Busca uma leitura de gás'
     #swagger.description = 'Permissão: logado.'
     #swagger.responses[200] = { description: 'Leitura', schema: { status: 'ok', data: { $ref: '#/definitions/LeituraGas' } } } */
);
router.post('/', somenteAdmin, leituraGasController.criar
  /* #swagger.summary = 'Lança a leitura de um apartamento'
     #swagger.description = 'Permissão: ADMIN. Um apto por vez, em ordem: só lança o próximo depois que o anterior estiver finalizado. Sem leitura retroativa. data_leitura = data do dia. leitura_anterior: obrigatória na 1ª leitura do apto ou na troca de relógio; nas outras, o banco usa a última leitura finalizada e ignora o valor enviado.'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/LeituraGasEntrada' } }
     #swagger.responses[201] = { description: 'Leitura lançada', schema: { status: 'ok', data: { $ref: '#/definitions/LeituraGas' } } } */
);
router.put('/:id', somenteAdmin, leituraGasController.alterar
  /* #swagger.summary = 'Corrige uma leitura'
     #swagger.description = 'Permissão: ADMIN. Só leitura não finalizada.'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $ref: '#/definitions/LeituraGasAlteracao' } }
     #swagger.responses[200] = { description: 'Leitura corrigida', schema: { status: 'ok', data: { $ref: '#/definitions/LeituraGas' } } } */
);
router.patch('/:id/finalizar', somenteAdmin, leituraGasController.finalizar
  /* #swagger.summary = 'Finaliza uma leitura'
     #swagger.description = 'Permissão: ADMIN. O banco calcula valor = consumo × valor_m3 e a leitura fica travada (não altera nem exclui).'
     #swagger.responses[200] = { description: 'Leitura finalizada', schema: { status: 'ok', data: { $ref: '#/definitions/LeituraGas' } } } */
);
router.delete('/:id', somenteAdmin, leituraGasController.excluir
  /* #swagger.summary = 'Exclui uma leitura'
     #swagger.description = 'Permissão: ADMIN. Só leitura não finalizada.'
     #swagger.responses[200] = { description: 'Leitura excluída', schema: { status: 'ok', message: 'Leitura de gás excluída.' } } */
);

module.exports = router;
