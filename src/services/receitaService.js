const db = require('../configs');
const ErroApi = require('../utils/ErroApi');
const { textoOuNulo } = require('../utils/texto');

// Receita = dinheiro que entra no caixa (RF10). Ex.: pagamento de fatura,
// lançado à mão (o status PAGA da fatura está desativado — parte 6).
// Não tem ligação com outras tabelas (decisão 2A).
const COLUNAS = 'id_receita, descricao, valor, data_recebimento, observacao';

// Filtros opcionais: ?mes=&ano= (da data de recebimento), igual às despesas
const listar = async ({ mes, ano } = {}) => {
  if (mes !== undefined && !(Number(mes) >= 1 && Number(mes) <= 12)) {
    throw new ErroApi(400, 'O mês deve estar entre 1 e 12.');
  }
  const sql = `SELECT ${COLUNAS}
                 FROM T_RECEITA
                WHERE ($1::INT IS NULL OR EXTRACT(MONTH FROM data_recebimento) = $1)
                  AND ($2::INT IS NULL OR EXTRACT(YEAR  FROM data_recebimento) = $2)
                ORDER BY data_recebimento DESC, id_receita DESC`;
  const result = await db.query(sql, [mes, ano]);
  return result.rows;
};

const buscarPorId = async (id) => {
  const sql = `SELECT ${COLUNAS}
                 FROM T_RECEITA
                WHERE id_receita = $1`;
  const result = await db.query(sql, [id]);
  if (result.rowCount === 0) {
    throw new ErroApi(404, 'Receita não encontrada.');
  }
  return result.rows[0];
};

const validar = ({ descricao, valor }) => {
  if (!textoOuNulo(descricao) || valor === undefined || valor === null || valor === '') {
    throw new ErroApi(400, 'Informe a descrição e o valor da receita.');
  }
  // valor > 0 é conferido pelo banco (ck_receita_valor)
};

// Decisão 3A: data de recebimento opcional — se não vier, é a data do dia
const criar = async (dados = {}) => {
  validar(dados);
  const sql = `INSERT INTO T_RECEITA (descricao, valor, data_recebimento, observacao)
               VALUES ($1, $2, COALESCE($3::DATE, CURRENT_DATE), $4)
               RETURNING ${COLUNAS}`;
  const result = await db.query(sql, [
    textoOuNulo(dados.descricao), dados.valor, dados.data_recebimento ?? null, textoOuNulo(dados.observacao)
  ]);
  return result.rows[0];
};

// Data não informada: mantém a atual
const alterar = async (id, dados = {}) => {
  validar(dados);
  const sql = `UPDATE T_RECEITA
                  SET descricao        = $1,
                      valor            = $2,
                      data_recebimento = COALESCE($3::DATE, data_recebimento),
                      observacao       = $4
                WHERE id_receita = $5
            RETURNING ${COLUNAS}`;
  const result = await db.query(sql, [
    textoOuNulo(dados.descricao), dados.valor, dados.data_recebimento ?? null, textoOuNulo(dados.observacao), id
  ]);
  if (result.rowCount === 0) {
    throw new ErroApi(404, 'Receita não encontrada.');
  }
  return result.rows[0];
};

// Decisão 1A: exclusão de verdade (a receita não é usada por outra tabela;
// o saldo é uma view e se ajusta sozinho)
const excluir = async (id) => {
  const result = await db.query('DELETE FROM T_RECEITA WHERE id_receita = $1', [id]);
  if (result.rowCount === 0) {
    throw new ErroApi(404, 'Receita não encontrada.');
  }
};

module.exports = {
  listar,
  buscarPorId,
  criar,
  alterar,
  excluir
};
