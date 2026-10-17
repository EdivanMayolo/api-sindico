const express = require('express');
const vinculoController = require('../controllers/vinculoController');
const somenteAdmin = require('../middlewares/somenteAdmin');

const router = express.Router();

// Consultar: qualquer usuário logado. Gravar: só ADMIN.
// Não existe DELETE: o vínculo é encerrado e fica no histórico.
router.get('/', vinculoController.listar);
router.get('/:id', vinculoController.buscarPorId);
router.post('/', somenteAdmin, vinculoController.criar);
router.put('/:id', somenteAdmin, vinculoController.alterar);
router.patch('/:id/encerrar', somenteAdmin, vinculoController.encerrar);

module.exports = router;
