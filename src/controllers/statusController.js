const statusService = require('../services/statusService');

// Controller: recebe a requisição, chama o service e monta a resposta.
const verificarConexao = async (req, res) => {
  try {
    const data = await statusService.verificarConexao();
    return res.status(200).json({
      status: 'ok',
      message: 'Conexão com o banco de dados realizada com sucesso',
      data
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Erro ao conectar ao banco de dados',
      error: error.message
    });
  }
};

module.exports = {
  verificarConexao
};
