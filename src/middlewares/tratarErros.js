const ErroApi = require('../utils/ErroApi');
const mensagensBanco = require('../utils/mensagensBanco');

// Middleware de erros: o Express 5 envia para cá qualquer erro lançado
// nos controllers/services (inclusive em funções async). Assim nenhum
// controller precisa de try/catch, e a resposta de erro é sempre igual.
module.exports = (error, req, res, next) => {
  let status = 500;
  let message = 'Erro interno no servidor.';

  if (error instanceof ErroApi) {
    // Regra de negócio validada no service
    status = error.status;
    message = error.message;
  } else if (error.type === 'entity.parse.failed') {
    // JSON mal formado no corpo da requisição
    status = 400;
    message = 'O corpo da requisição não é um JSON válido.';
  } else if (error.code === '23505' || error.code === '23503') {
    // 23505 = UNIQUE, 23503 = FOREIGN KEY
    status = 409;
    message = mensagensBanco[error.constraint] || 'Operação não permitida pelas regras do banco de dados.';
  } else if (error.code === '23514') {
    // 23514 = CHECK
    status = 400;
    message = mensagensBanco[error.constraint] || 'Valor não permitido pelas regras do banco de dados.';
  } else if (error.code === '23502') {
    // 23502 = NOT NULL
    status = 400;
    message = `Campo obrigatório não informado: ${error.column}.`;
  } else if (error.code === 'P0001') {
    // RAISE EXCEPTION dos triggers: a mensagem já está em português
    status = 400;
    message = error.message;
  } else if (['22P02', '22007', '22008'].includes(error.code)) {
    // Valor em formato errado (ex.: texto onde era número ou data)
    status = 400;
    message = 'Valor informado em formato inválido.';
  } else if (['22001', '22003'].includes(error.code)) {
    // Texto maior que a coluna ou número fora do limite
    status = 400;
    message = 'Valor informado excede o tamanho permitido.';
  }

  // Erro inesperado: o detalhe fica só no console, nunca vai para o usuário
  if (status === 500) {
    console.error(error);
  }

  return res.status(status).json({ status: 'error', message });
};
