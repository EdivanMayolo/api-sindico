const faturaService = require('../services/faturaService');

// RF17: consultar por apartamento, mês e ano (?id_apartamento=&mes=&ano=&status=)
const listar = async (req, res) => {
  const data = await faturaService.listar(req.query);
  return res.status(200).json({ status: 'ok', data });
};

const buscarPorId = async (req, res) => {
  const data = await faturaService.buscarPorId(req.params.id);
  return res.status(200).json({ status: 'ok', data });
};

// Gera as faturas de todos os apartamentos de um mês: { mes, ano }
const gerar = async (req, res) => {
  const data = await faturaService.gerar(req.body);
  return res.status(201).json({ status: 'ok', data });
};

const adicionarItem = async (req, res) => {
  const data = await faturaService.adicionarItem(req.params.id, req.body);
  return res.status(201).json({ status: 'ok', data });
};

const removerItem = async (req, res) => {
  const data = await faturaService.removerItem(req.params.id, req.params.id_item);
  return res.status(200).json({ status: 'ok', data });
};

// DESATIVADO por enquanto (a rota está comentada em faturaRouter.js)
const alterarStatus = async (req, res) => {
  const data = await faturaService.alterarStatus(req.params.id, req.body);
  return res.status(200).json({ status: 'ok', data });
};

module.exports = {
  listar,
  buscarPorId,
  gerar,
  adicionarItem,
  removerItem,
  alterarStatus
};
