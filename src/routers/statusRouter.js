const express = require('express');
const statusController = require('../controllers/statusController');

const router = express.Router();

router.get('/', statusController.verificarConexao
  /* #swagger.summary = 'Testa a API e a conexão com o banco'
     #swagger.description = 'Permissão: pública.'
     #swagger.responses[200] = { description: 'API e banco funcionando', schema: { status: 'ok', data: { $ref: '#/definitions/Status' } } } */
);

module.exports = router;
