const db = require('../configs');
const ErroApi = require('../utils/ErroApi');

// Movimentação e saldo NÃO são tabelas: vêm das views do banco
// (vw_movimentacao_financeira e vw_saldo), calculadas na hora a partir das
// receitas (ENTRADA) e das despesas ativas (SAIDA). Nada é gravado duas vezes.

// Período opcional ?data_inicio=&data_fim= (AAAA-MM-DD)
const validarPeriodo = ({ data_inicio, data_fim }) => {
  if (data_inicio && data_fim && data_inicio > data_fim) {
    throw new ErroApi(400, 'A data inicial não pode ser maior que a data final.');
  }
};

// Extrato (RF11/RF18): entradas e saídas em ordem de data.
// Filtros opcionais: período e ?tipo=ENTRADA|SAIDA
const movimentacao = async ({ data_inicio, data_fim, tipo } = {}) => {
  validarPeriodo({ data_inicio, data_fim });
  if (tipo !== undefined && !['ENTRADA', 'SAIDA'].includes(tipo)) {
    throw new ErroApi(400, 'Tipo inválido. Use ENTRADA ou SAIDA.');
  }
  const sql = `SELECT tipo, id_origem, descricao, valor, data
                 FROM vw_movimentacao_financeira
                WHERE ($1::DATE    IS NULL OR data >= $1)
                  AND ($2::DATE    IS NULL OR data <= $2)
                  AND ($3::VARCHAR IS NULL OR tipo  = $3)
                ORDER BY data, tipo, id_origem`;
  const result = await db.query(sql, [data_inicio ?? null, data_fim ?? null, tipo ?? null]);
  return result.rows;
};

// Saldo (RF12):
//   - sem período → saldo geral (view vw_saldo)
//   - com período → saldo anterior + entradas − saídas do período = saldo final
//     (decisão 4A, calculado a partir da view de movimentação)
const saldo = async ({ data_inicio, data_fim } = {}) => {
  validarPeriodo({ data_inicio, data_fim });

  if (!data_inicio && !data_fim) {
    const geral = (await db.query('SELECT total_receitas, total_despesas, saldo FROM vw_saldo')).rows[0];
    return geral;
  }

  const sql = `SELECT COALESCE(SUM(CASE WHEN $1::DATE IS NOT NULL AND data < $1
                                        THEN CASE tipo WHEN 'ENTRADA' THEN valor ELSE -valor END
                                   END), 0) AS saldo_anterior,
                      COALESCE(SUM(CASE WHEN tipo = 'ENTRADA'
                                         AND ($1::DATE IS NULL OR data >= $1)
                                         AND ($2::DATE IS NULL OR data <= $2)
                                        THEN valor END), 0) AS entradas,
                      COALESCE(SUM(CASE WHEN tipo = 'SAIDA'
                                         AND ($1::DATE IS NULL OR data >= $1)
                                         AND ($2::DATE IS NULL OR data <= $2)
                                        THEN valor END), 0) AS saidas
                 FROM vw_movimentacao_financeira`;
  const { saldo_anterior, entradas, saidas } = (await db.query(sql, [data_inicio ?? null, data_fim ?? null])).rows[0];

  // Conta em centavos para não errar no arredondamento
  const centavos = (v) => Math.round(v * 100);
  return {
    data_inicio: data_inicio ?? null,
    data_fim: data_fim ?? null,
    saldo_anterior,
    entradas,
    saidas,
    saldo_periodo: (centavos(entradas) - centavos(saidas)) / 100,
    saldo_final: (centavos(saldo_anterior) + centavos(entradas) - centavos(saidas)) / 100
  };
};

module.exports = {
  movimentacao,
  saldo
};
