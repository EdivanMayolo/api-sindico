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
// Swagger (/api-docs): #swagger.tags agrupa as rotas de cada router e
// #swagger.security põe o cadeado (Authorize) nas rotas que exigem login.
module.exports = (app) => {
  app.use('/', statusRouter /* #swagger.tags = ['Status'] */);
  app.use('/auth', authRouter /* #swagger.tags = ['Auth'] */);
  app.use('/usuarios', autenticacao, somenteAdmin, usuarioRouter /* #swagger.tags = ['Usuários']
     #swagger.security = [{ "bearerAuth": [] }] */);
  app.use('/apartamentos', autenticacao, apartamentoRouter /* #swagger.tags = ['Apartamentos']
     #swagger.security = [{ "bearerAuth": [] }] */);
  app.use('/pessoas', autenticacao, pessoaRouter /* #swagger.tags = ['Pessoas']
     #swagger.security = [{ "bearerAuth": [] }] */);
  app.use('/vinculos', autenticacao, vinculoRouter /* #swagger.tags = ['Vínculos']
     #swagger.security = [{ "bearerAuth": [] }] */);
  app.use('/despesas', autenticacao, despesaRouter /* #swagger.tags = ['Despesas']
     #swagger.security = [{ "bearerAuth": [] }] */);
  app.use('/leituras-gas', autenticacao, leituraGasRouter /* #swagger.tags = ['Leituras de gás']
     #swagger.security = [{ "bearerAuth": [] }] */);
  app.use('/faturas', autenticacao, faturaRouter /* #swagger.tags = ['Faturas']
     #swagger.security = [{ "bearerAuth": [] }] */);
  app.use('/receitas', autenticacao, receitaRouter /* #swagger.tags = ['Receitas']
     #swagger.security = [{ "bearerAuth": [] }] */);
  app.use('/financeiro', autenticacao, financeiroRouter /* #swagger.tags = ['Financeiro']
     #swagger.security = [{ "bearerAuth": [] }] */);
}
