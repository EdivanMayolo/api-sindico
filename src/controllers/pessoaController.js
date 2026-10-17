const pessoaService = require('../services/pessoaService');

const listar = async (req, res) => {
  const data = await pessoaService.listar(req.query);
  return res.status(200).json({ status: 'ok', data });
};

const buscarPorId = async (req, res) => {
  const data = await pessoaService.buscarPorId(req.params.id);
  return res.status(200).json({ status: 'ok', data });
};

const criar = async (req, res) => {
  const data = await pessoaService.criar(req.body);
  return res.status(201).json({ status: 'ok', data });
};

const alterar = async (req, res) => {
  const data = await pessoaService.alterar(req.params.id, req.body);
  return res.status(200).json({ status: 'ok', data });
};

// Exclui ou só inativa, conforme o histórico (a mensagem diz o que aconteceu)
const excluir = async (req, res) => {
  const message = await pessoaService.excluir(req.params.id);
  return res.status(200).json({ status: 'ok', message });
};

module.exports = {
  listar,
  buscarPorId,
  criar,
  alterar,
  excluir
};
