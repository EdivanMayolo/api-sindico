const apartamentoService = require('../services/apartamentoService');

const listar = async (req, res) => {
  const data = await apartamentoService.listar(req.query);
  return res.status(200).json({ status: 'ok', data });
};

const buscarPorId = async (req, res) => {
  const data = await apartamentoService.buscarPorId(req.params.id);
  return res.status(200).json({ status: 'ok', data });
};

const criar = async (req, res) => {
  const data = await apartamentoService.criar(req.body);
  return res.status(201).json({ status: 'ok', data });
};

const alterar = async (req, res) => {
  const data = await apartamentoService.alterar(req.params.id, req.body);
  return res.status(200).json({ status: 'ok', data });
};

const inativar = async (req, res) => {
  const data = await apartamentoService.inativar(req.params.id);
  return res.status(200).json({ status: 'ok', data });
};

const ativar = async (req, res) => {
  const data = await apartamentoService.ativar(req.params.id);
  return res.status(200).json({ status: 'ok', data });
};

module.exports = {
  listar,
  buscarPorId,
  criar,
  alterar,
  inativar,
  ativar
};
