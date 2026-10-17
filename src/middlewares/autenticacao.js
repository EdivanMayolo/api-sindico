const jwt = require('jsonwebtoken');
const ErroApi = require('../utils/ErroApi');

// Protege as rotas (RNF05): só passa quem enviar um token válido no cabeçalho
//   Authorization: Bearer <token>
// O token é gerado no login (POST /auth/login). Se for válido, os dados do
// usuário logado ficam em req.usuario para os controllers usarem.
module.exports = (req, res, next) => {
  const [tipo, token] = (req.headers.authorization || '').split(' ');

  if (tipo !== 'Bearer' || !token) {
    throw new ErroApi(401, 'Faça login para acessar esta rota.');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ErroApi(401, 'Sessão expirada. Faça login novamente.');
    }
    throw new ErroApi(401, 'Token inválido. Faça login novamente.');
  }

  req.usuario = {
    id_usuario: payload.id_usuario,
    nome: payload.nome,
    perfil: payload.perfil
  };
  next();
};
