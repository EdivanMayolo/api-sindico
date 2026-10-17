const db = require('../configs');
const ErroApi = require('../utils/ErroApi');
const { textoOuNulo, somenteNumeros } = require('../utils/texto');
const vinculoService = require('./vinculoService');

// Valida os campos obrigatórios e devolve os dados limpos para gravar.
// O CPF chega com ou sem máscara e é gravado só com os 11 números.
// Os dígitos verificadores são conferidos pelo banco (fn_valida_cpf → "CPF inválido.").
const prepararDados = ({ nome, cpf, telefone, email, endereco }) => {
  if (!textoOuNulo(nome) || !textoOuNulo(cpf) || !textoOuNulo(telefone)) {
    throw new ErroApi(400, 'Informe o nome, o CPF e o telefone da pessoa.');
  }
  const cpfLimpo = somenteNumeros(cpf);
  if (cpfLimpo.length !== 11) {
    throw new ErroApi(400, 'O CPF deve ter 11 dígitos.');
  }
  return [textoOuNulo(nome), cpfLimpo, textoOuNulo(telefone), textoOuNulo(email), textoOuNulo(endereco)];
};

const contarVinculosAtivos = async (id) => {
  const sql = `SELECT COUNT(*) AS total
                 FROM T_VINCULO_APARTAMENTO
                WHERE id_pessoa = $1
                  AND ativo     = TRUE`;
  const result = await db.query(sql, [id]);
  return Number(result.rows[0].total);
};

// Filtro opcional ?ativo=true|false
const listar = async ({ ativo } = {}) => {
  const sql = `SELECT id_pessoa, nome, cpf, telefone, email, endereco, ativo
                 FROM T_PESSOA
                WHERE ($1::BOOLEAN IS NULL OR ativo = $1)
                ORDER BY nome`;
  const result = await db.query(sql, [ativo]);
  return result.rows;
};

// Dados da pessoa + vínculos ativos (de quais apartamentos é dona ou inquilina)
const buscarPorId = async (id) => {
  const sql = `SELECT id_pessoa, nome, cpf, telefone, email, endereco, ativo
                 FROM T_PESSOA
                WHERE id_pessoa = $1`;
  const result = await db.query(sql, [id]);
  if (result.rowCount === 0) {
    throw new ErroApi(404, 'Pessoa não encontrada.');
  }
  const pessoa = result.rows[0];
  pessoa.vinculos = await vinculoService.listar({ id_pessoa: id, ativo: true });
  return pessoa;
};

const criar = async (dados = {}) => {
  const sql = `INSERT INTO T_PESSOA (nome, cpf, telefone, email, endereco)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id_pessoa, nome, cpf, telefone, email, endereco, ativo`;
  const result = await db.query(sql, prepararDados(dados));
  return result.rows[0];
};

// ativo não informado: mantém o valor atual (COALESCE)
const alterar = async (id, dados = {}) => {
  const valores = prepararDados(dados);

  // Pessoa com vínculo ativo não pode ser inativada (o apto ficaria com
  // proprietário/inquilino inativo). Encerrar os vínculos antes.
  if (dados.ativo === false && await contarVinculosAtivos(id) > 0) {
    throw new ErroApi(409, 'A pessoa possui vínculo ativo com apartamento. Encerre os vínculos antes de inativá-la.');
  }

  const sql = `UPDATE T_PESSOA
                  SET nome     = $1,
                      cpf      = $2,
                      telefone = $3,
                      email    = $4,
                      endereco = $5,
                      ativo    = COALESCE($6, ativo)
                WHERE id_pessoa = $7
            RETURNING id_pessoa, nome, cpf, telefone, email, endereco, ativo`;
  const result = await db.query(sql, [...valores, dados.ativo, id]);
  if (result.rowCount === 0) {
    throw new ErroApi(404, 'Pessoa não encontrada.');
  }
  return result.rows[0];
};

// RF3 pede "excluir". Para não perder o histórico (RN08):
//   - com vínculo ativo     → não deixa (encerrar os vínculos antes)
//   - só vínculos antigos   → apenas inativa
//   - nunca teve vínculo    → exclui de verdade
const excluir = async (id) => {
  const pessoa = await buscarPorId(id);
  if (pessoa.vinculos.length > 0) {
    throw new ErroApi(409, 'A pessoa possui vínculo ativo com apartamento. Encerre os vínculos antes de excluí-la.');
  }

  const historico = await db.query('SELECT 1 FROM T_VINCULO_APARTAMENTO WHERE id_pessoa = $1 LIMIT 1', [id]);
  if (historico.rowCount > 0) {
    await db.query('UPDATE T_PESSOA SET ativo = FALSE WHERE id_pessoa = $1', [id]);
    return 'A pessoa possui histórico de vínculos e foi inativada.';
  }

  await db.query('DELETE FROM T_PESSOA WHERE id_pessoa = $1', [id]);
  return 'Pessoa excluída.';
};

module.exports = {
  listar,
  buscarPorId,
  criar,
  alterar,
  excluir
};
