const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../configs');
const ErroApi = require('../utils/ErroApi');
const usuarioService = require('./usuarioService');

// Login (RF1): confere e-mail e senha e devolve um token JWT
const login = async ({ email, senha } = {}) => {
  if (!email || !senha) {
    throw new ErroApi(400, 'Informe o e-mail e a senha.');
  }

  const sql = `SELECT id_usuario, nome, email, senha_hash, perfil, ativo
                 FROM T_USUARIO
                WHERE email = $1`;
  const result = await db.query(sql, [usuarioService.limparEmail(email)]);
  const usuario = result.rows[0];

  // Mesma mensagem para e-mail inexistente, usuário inativo ou senha errada:
  // assim ninguém descobre quais e-mails estão cadastrados.
  const senhaConfere = usuario && usuario.ativo && await bcrypt.compare(String(senha), usuario.senha_hash);
  if (!senhaConfere) {
    throw new ErroApi(401, 'E-mail ou senha inválidos.');
  }

  const token = jwt.sign(
    { id_usuario: usuario.id_usuario, nome: usuario.nome, perfil: usuario.perfil },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return {
    token,
    usuario: {
      id_usuario: usuario.id_usuario,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil
    }
  };
};

// O próprio usuário troca a senha: precisa confirmar a senha atual
const alterarMinhaSenha = async (idUsuario, { senha_atual, nova_senha } = {}) => {
  if (!senha_atual || !nova_senha) {
    throw new ErroApi(400, 'Informe a senha atual e a nova senha.');
  }

  const sql = `SELECT senha_hash
                 FROM T_USUARIO
                WHERE id_usuario = $1`;
  const result = await db.query(sql, [idUsuario]);
  const usuario = result.rows[0];

  if (!usuario || !await bcrypt.compare(String(senha_atual), usuario.senha_hash)) {
    throw new ErroApi(400, 'Senha atual incorreta.');
  }

  await usuarioService.alterarSenha(idUsuario, nova_senha);
};

module.exports = {
  login,
  alterarMinhaSenha
};
