const statusController = require('../controllers/statusController');

// Router: só define o caminho (URL) e qual controller atende.
module.exports = (app) => {
  app.get('/', statusController.verificarConexao);
};
