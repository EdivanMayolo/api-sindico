const statusService = require('../services/statusService');

// Sem try/catch: se der erro, o Express envia para o middlewares/tratarErros.js
const verificarConexao = async (req, res) => {
  const data = await statusService.verificarConexao();
  return res.status(200).json({ status: 'ok', data });
};

module.exports = {
  verificarConexao
};
