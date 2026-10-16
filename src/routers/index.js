const autenticacao = require('../middlewares/autenticacao');
const somenteAdmin = require('../middlewares/somenteAdmin');
const statusRouter = require('./statusRouter');
const authRouter = require('./authRouter');
const usuarioRouter = require('./usuarioRouter');

// Cada recurso fica em um router próprio, com o seu prefixo de URL.
// A proteção fica visível aqui:
//   público              → app.use('/rota', router)
//   precisa de login     → app.use('/rota', autenticacao, router)
//   só ADMIN             → app.use('/rota', autenticacao, somenteAdmin, router)
module.exports = (app) => {
  app.use('/', statusRouter);
  app.use('/auth', authRouter);
  app.use('/usuarios', autenticacao, somenteAdmin, usuarioRouter);
}
