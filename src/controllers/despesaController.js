const despesaService = require('../services/despesaService');

// Filtros opcionais: ?mes=&ano=&tipo_despesa=&ativo=
const listar = async (req, res) => {
  const data = await despesaService.listar(req.query);
  return res.status(200).json({ status: 'ok', data });
};

// Fixas previstas para o mês (?mes=&ano=): não grava nada
const listarPrevistas = async (req, res) => {
  const data = await despesaService.listarPrevistas(req.query);
  return res.status(200).json({ status: 'ok', data });
};

const buscarPorId = async (req, res) => {
  const data = await despesaService.buscarPorId(req.params.id);
  return res.status(200).json({ status: 'ok', data });
};

const criar = async (req, res) => {
  const data = await despesaService.criar(req.body);
  return res.status(201).json({ status: 'ok', data });
};

const alterar = async (req, res) => {
  const data = await despesaService.alterar(req.params.id, req.body);
  return res.status(200).json({ status: 'ok', data });
};

// Exclui ou só inativa, conforme o uso (a mensagem diz o que aconteceu)
const excluir = async (req, res) => {
  const message = await despesaService.excluir(req.params.id);
  return res.status(200).json({ status: 'ok', message });
};

const previaRateio = async (req, res) => {
  const data = await despesaService.previaRateio(req.params.id);
  return res.status(200).json({ status: 'ok', data });
};

module.exports = {
  listar,
  listarPrevistas,
  buscarPorId,
  criar,
  alterar,
  excluir,
  previaRateio
};
