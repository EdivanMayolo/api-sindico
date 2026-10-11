const statusRouter = require('./statusRouter');

// Cada recurso fica em um router próprio, com o seu prefixo de URL
module.exports = (app) => {
  app.use('/', statusRouter);
}
