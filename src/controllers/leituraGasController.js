const leituraGasService = require('../services/leituraGasService');

// Tela de leitura: todos os aptos ativos da despesa de gás, em ordem, com a
// situação de cada um, o próximo a ser lido e a diferença conta x consumo
const painel = async (req, res) => {
  const data = await leituraGasService.painel(req.params.id_despesa);
  return res.status(200).json({ status: 'ok', data });
};

const buscarPorId = async (req, res) => {
  const data = await leituraGasService.buscarPorId(req.params.id);
  return res.status(200).json({ status: 'ok', data });
};

const criar = async (req, res) => {
  const data = await leituraGasService.criar(req.body);
  return res.status(201).json({ status: 'ok', data });
};

const alterar = async (req, res) => {
  const data = await leituraGasService.alterar(req.params.id, req.body);
  return res.status(200).json({ status: 'ok', data });
};

const finalizar = async (req, res) => {
  const data = await leituraGasService.finalizar(req.params.id);
  return res.status(200).json({ status: 'ok', data });
};

const excluir = async (req, res) => {
  await leituraGasService.excluir(req.params.id);
  return res.status(200).json({ status: 'ok', message: 'Leitura de gás excluída.' });
};

module.exports = {
  painel,
  buscarPorId,
  criar,
  alterar,
  finalizar,
  excluir
};
