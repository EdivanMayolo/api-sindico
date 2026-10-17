// Responde 404 em JSON quando nenhuma rota atende a URL pedida
module.exports = (req, res) => {
  return res.status(404).json({
    status: 'error',
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`
  });
};
