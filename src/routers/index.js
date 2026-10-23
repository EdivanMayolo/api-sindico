const autenticacao = require('../middlewares/autenticacao');
const somenteAdmin = require('../middlewares/somenteAdmin');
const statusRouter = require('./statusRouter');
const authRouter = require('./authRouter');
const usuarioRouter = require('./usuarioRouter');
const apartamentoRouter = require('./apartamentoRouter');
const pessoaRouter = require('./pessoaRouter');
const vinculoRouter = require('./vinculoRouter');
const despesaRouter = require('./despesaRouter');
const leituraGasRouter = require('./leituraGasRouter');
const faturaRouter = require('./faturaRouter');
const receitaRouter = require('./receitaRouter');
const financeiroRouter = require('./financeiroRouter');

// Cada recurso fica em um router próprio, com o seu prefixo de URL.
// A proteção fica visível aqui:
//   público              → app.use('/rota', router)
//   precisa de login     → app.use('/rota', autenticacao, router)
//   só ADMIN             → app.use('/rota', autenticacao, somenteAdmin, router)
// Nos cadastros, consultar é para qualquer logado e gravar é só ADMIN:
// o somenteAdmin fica rota a rota dentro do router.
module.exports = (app) => {
  app.use('/', statusRouter);
  app.use('/auth', authRouter);
  app.use('/usuarios', autenticacao, somenteAdmin, usuarioRouter);
  app.use('/apartamentos', autenticacao, apartamentoRouter);
  app.use('/pessoas', autenticacao, pessoaRouter);
  app.use('/vinculos', autenticacao, vinculoRouter);
  app.use('/despesas', autenticacao, despesaRouter);
  app.use('/leituras-gas', autenticacao, leituraGasRouter);
  app.use('/faturas', autenticacao, faturaRouter);
  app.use('/receitas', autenticacao, receitaRouter);
  app.use('/financeiro', autenticacao, financeiroRouter);
}
