const bcrypt = require('bcrypt');
const db = require('../configs');
const ErroApi = require('../utils/ErroApi');

const TAMANHO_MINIMO_SENHA = 6;

// Gera o hash da senha (RNF06): a senha pura nunca é gravada no banco
const gerarHashSenha = async (senha) => {
  if (!senha || String(senha).length < TAMANHO_MINIMO_SENHA) {
    throw new ErroApi(400, `A senha deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
  }
  return bcrypt.hash(String(senha), 10);
};

// E-mail sempre em minúsculas e sem espaços, para o login não diferenciar
const limparEmail = (email) => String(email).trim().toLowerCase();

const listar = async () => {
  const sql = `SELECT id_usuario, nome, email, perfil, ativo
                 FROM T_USUARIO
                ORDER BY nome`;
  const result = await db.query(sql);
  return result.rows;
};

const buscarPorId = async (id) => {
  const sql = `SELECT id_usuario, nome, email, perfil, ativo
                 FROM T_USUARIO
                WHERE id_usuario = $1`;
  const result = await db.query(sql, [id]);
  if (result.rowCount === 0) {
    throw new ErroApi(404, 'Usuário não encontrado.');
  }
  return result.rows[0];
};

const criar = async ({ nome, email, senha, perfil } = {}) => {
  if (!nome || !email) {
    throw new ErroApi(400, 'Informe o nome e o e-mail do usuário.');
  }
  const senhaHash = await gerarHashSenha(senha);

  const sql = `INSERT INTO T_USUARIO (nome, email, senha_hash, perfil)
               VALUES ($1, $2, $3, $4)
               RETURNING id_usuario, nome, email, perfil, ativo`;
  const result = await db.query(sql, [nome, limparEmail(email), senhaHash, perfil || 'COMUM']);
  return result.rows[0];
};

// idLogado: quem está fazendo a alteração. O administrador não pode tirar
// o próprio acesso, senão o sistema pode ficar sem nenhum ADMIN.
const alterar = async (id, { nome, email, perfil, ativo } = {}, idLogado) => {
  if (!nome || !email || !perfil) {
    throw new ErroApi(400, 'Informe o nome, o e-mail e o perfil do usuário.');
  }
  if (Number(id) === idLogado && (perfil !== 'ADMIN' || ativo === false)) {
    throw new ErroApi(400, 'Você não pode remover o seu próprio acesso de administrador.');
  }

  // ativo não informado: mantém o valor atual (COALESCE)
  const sql = `UPDATE T_USUARIO
                  SET nome   = $1,
                      email  = $2,
                      perfil = $3,
                      ativo  = COALESCE($4, ativo)
                WHERE id_usuario = $5
            RETURNING id_usuario, nome, email, perfil, ativo`;
  const result = await db.query(sql, [nome, limparEmail(email), perfil, ativo, id]);
  if (result.rowCount === 0) {
    throw new ErroApi(404, 'Usuário não encontrado.');
  }
  return result.rows[0];
};

const alterarSenha = async (id, novaSenha) => {
  const senhaHash = await gerarHashSenha(novaSenha);

  const sql = `UPDATE T_USUARIO
                  SET senha_hash = $1
                WHERE id_usuario = $2`;
  const result = await db.query(sql, [senhaHash, id]);
  if (result.rowCount === 0) {
    throw new ErroApi(404, 'Usuário não encontrado.');
  }
};

module.exports = {
  limparEmail,
  listar,
  buscarPorId,
  criar,
  alterar,
  alterarSenha
};
