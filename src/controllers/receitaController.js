const receitaService = require('../services/receitaService');

// Filtros opcionais: ?mes=&ano=
const listar = async (req, res) => {
  const data = await receitaService.listar(req.query);
  return res.status(200).json({ status: 'ok', data });
};

const buscarPorId = async (req, res) => {
  const data = await receitaService.buscarPorId(req.params.id);
  return res.status(200).json({ status: 'ok', data });
};

const criar = async (req, res) => {
  const data = await receitaService.criar(req.body);
  return res.status(201).json({ status: 'ok', data });
};

const alterar = async (req, res) => {
  const data = await receitaService.alterar(req.params.id, req.body);
  return res.status(200).json({ status: 'ok', data });
};

const excluir = async (req, res) => {
  await receitaService.excluir(req.params.id);
  return res.status(200).json({ status: 'ok', message: 'Receita excluída.' });
};

module.exports = {
  listar,
  buscarPorId,
  criar,
  alterar,
  excluir
};
