const ErroApi = require('../utils/ErroApi');

// Só deixa passar usuário com perfil ADMIN.
// Deve vir sempre DEPOIS do middleware de autenticação (que preenche req.usuario).
module.exports = (req, res, next) => {
  if (req.usuario.perfil !== 'ADMIN') {
    throw new ErroApi(403, 'Sem permissão. Apenas administradores podem realizar esta ação.');
  }
  next();
};
