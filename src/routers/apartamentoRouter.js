const express = require('express');
const apartamentoController = require('../controllers/apartamentoController');
const somenteAdmin = require('../middlewares/somenteAdmin');

const router = express.Router();

// Consultar: qualquer usuário logado. Gravar: só ADMIN.
// RN01: não existe DELETE — o apartamento é só inativado.
router.get('/', apartamentoController.listar);
router.get('/:id', apartamentoController.buscarPorId);
router.post('/', somenteAdmin, apartamentoController.criar);
router.put('/:id', somenteAdmin, apartamentoController.alterar);
router.patch('/:id/inativar', somenteAdmin, apartamentoController.inativar);
router.patch('/:id/ativar', somenteAdmin, apartamentoController.ativar);

module.exports = router;
