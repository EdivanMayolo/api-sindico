const authService = require('../services/authService');
const usuarioService = require('../services/usuarioService');

const login = async (req, res) => {
  const data = await authService.login(req.body);
  return res.status(200).json({ status: 'ok', data });
};

// Dados do usuário logado (o Quasar usa para montar o menu conforme o perfil)
const meusDados = async (req, res) => {
  const data = await usuarioService.buscarPorId(req.usuario.id_usuario);
  return res.status(200).json({ status: 'ok', data });
};

const alterarMinhaSenha = async (req, res) => {
  await authService.alterarMinhaSenha(req.usuario.id_usuario, req.body);
  return res.status(200).json({ status: 'ok', message: 'Senha alterada com sucesso.' });
};

module.exports = {
  login,
  meusDados,
  alterarMinhaSenha
};
