const usuarioService = require('../services/usuarioService');

const listar = async (req, res) => {
  const data = await usuarioService.listar();
  return res.status(200).json({ status: 'ok', data });
};

const buscarPorId = async (req, res) => {
  const data = await usuarioService.buscarPorId(req.params.id);
  return res.status(200).json({ status: 'ok', data });
};

const criar = async (req, res) => {
  const data = await usuarioService.criar(req.body);
  return res.status(201).json({ status: 'ok', data });
};

const alterar = async (req, res) => {
  const data = await usuarioService.alterar(req.params.id, req.body, req.usuario.id_usuario);
  return res.status(200).json({ status: 'ok', data });
};

// O administrador define uma nova senha para o usuário (ex.: esqueceu a senha)
const alterarSenha = async (req, res) => {
  await usuarioService.alterarSenha(req.params.id, req.body?.nova_senha);
  return res.status(200).json({ status: 'ok', message: 'Senha alterada com sucesso.' });
};

module.exports = {
  listar,
  buscarPorId,
  criar,
  alterar,
  alterarSenha
};
