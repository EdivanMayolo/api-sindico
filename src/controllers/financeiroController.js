const financeiroService = require('../services/financeiroService');

// Extrato de entradas e saídas: ?data_inicio=&data_fim=&tipo=
const movimentacao = async (req, res) => {
  const data = await financeiroService.movimentacao(req.query);
  return res.status(200).json({ status: 'ok', data });
};

// Saldo geral (sem filtro) ou do período: ?data_inicio=&data_fim=
const saldo = async (req, res) => {
  const data = await financeiroService.saldo(req.query);
  return res.status(200).json({ status: 'ok', data });
};

module.exports = {
  movimentacao,
  saldo
};
