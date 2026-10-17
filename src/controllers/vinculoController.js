const vinculoService = require('../services/vinculoService');

// Filtros opcionais: ?id_apartamento=, ?id_pessoa=, ?ativo=
const listar = async (req, res) => {
  const data = await vinculoService.listar(req.query);
  return res.status(200).json({ status: 'ok', data });
};

const buscarPorId = async (req, res) => {
  const data = await vinculoService.buscarPorId(req.params.id);
  return res.status(200).json({ status: 'ok', data });
};

const criar = async (req, res) => {
  const data = await vinculoService.criar(req.body);
  return res.status(201).json({ status: 'ok', data });
};

const alterar = async (req, res) => {
  const data = await vinculoService.alterar(req.params.id, req.body);
  return res.status(200).json({ status: 'ok', data });
};

const encerrar = async (req, res) => {
  const data = await vinculoService.encerrar(req.params.id, req.body);
  return res.status(200).json({ status: 'ok', data });
};

module.exports = {
  listar,
  buscarPorId,
  criar,
  alterar,
  encerrar
};
