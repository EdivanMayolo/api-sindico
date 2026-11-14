const db = require('../configs');
const ErroApi = require('../utils/ErroApi');
const { textoOuNulo } = require('../utils/texto');
const apartamentoService = require('./apartamentoService');

// Colunas devolvidas em todas as consultas de despesa.
// A despesa é cobrada na fatura do MÊS SEGUINTE ao da data_referencia
// (gasto de junho → fatura de julho): mes_cobranca e ano_cobranca.
// em_uso: já lançada em fatura não cancelada ou com leituras de gás — só
// descrição e observação podem mudar e não pode ser excluída (o Quasar
// usa para bloquear os campos antes de o usuário tentar).
const COLUNAS = `id_despesa, descricao, tipo_despesa, valor_total, valor_m3,
                 data_referencia, observacao, ativo,
                 EXTRACT(MONTH FROM data_referencia + INTERVAL '1 month')::INT AS mes_cobranca,
                 EXTRACT(YEAR  FROM data_referencia + INTERVAL '1 month')::INT AS ano_cobranca,
                 (EXISTS (SELECT 1
                            FROM T_ITEM_FATURA A, T_FATURA B
                           WHERE A.id_fatura  = B.id_fatura
                             AND A.id_despesa = T_DESPESA.id_despesa
                             AND B.status    <> 'CANCELADA')
                  OR EXISTS (SELECT 1
                               FROM T_LEITURA_GAS C
                              WHERE C.id_despesa = T_DESPESA.id_despesa)) AS em_uso`;

// Valida os campos obrigatórios e devolve os valores na ordem do INSERT/UPDATE.
// tipo_despesa, valor > 0 e valor_m3 só em VARIAVEL são conferidos pelo banco (ck_).
const prepararDados = ({ descricao, tipo_despesa, valor_total, valor_m3, data_referencia, observacao }) => {
  if (!textoOuNulo(descricao) || !tipo_despesa || valor_total === undefined || valor_total === null || !data_referencia) {
    throw new ErroApi(400, 'Informe a descrição, o tipo, o valor total e a data de referência da despesa.');
  }
  return [textoOuNulo(descricao), tipo_despesa, valor_total, valor_m3 ?? null, data_referencia, textoOuNulo(observacao)];
};

// Mês fechado não recebe despesa: se as faturas de um mês já foram geradas (não canceladas),
// nenhuma despesa (de qualquer tipo) pode ter data de referência nesse mês nem antes dele.
const validarMesAberto = async (data_referencia) => {
  const sql = `SELECT TO_CHAR(U.ultimo, 'MM/YYYY')                       AS ultimo,
                      TO_CHAR(U.ultimo + INTERVAL '1 month', 'MM/YYYY') AS proximo,
                      ($1::DATE < U.ultimo + INTERVAL '1 month')         AS fechado
                 FROM (SELECT MAX(MAKE_DATE(ano_referencia, mes_referencia, 1)) AS ultimo
                         FROM T_FATURA
                        WHERE status <> 'CANCELADA') U`;
  const { ultimo, proximo, fechado } = (await db.query(sql, [data_referencia])).rows[0];
  if (fechado) {
    throw new ErroApi(409, `As faturas de ${ultimo} já foram geradas: não é possível lançar despesa nesse mês nem em meses anteriores. Use uma data de referência a partir de ${proximo}.`);
  }
};

// Onde a despesa já foi usada:
//   itens_validos    → cobrada em fatura que vale (não cancelada)
//   itens_cancelados → só aparece em faturas canceladas
//   leituras         → despesa de gás com leituras lançadas
const verificarUso = async (id) => {
  const sql = `SELECT (SELECT COUNT(*)
                         FROM T_ITEM_FATURA A, T_FATURA B
                        WHERE A.id_fatura  = B.id_fatura
                          AND A.id_despesa = $1
                          AND B.status    <> 'CANCELADA') AS itens_validos,
                      (SELECT COUNT(*)
                         FROM T_ITEM_FATURA A, T_FATURA B
                        WHERE A.id_fatura  = B.id_fatura
                          AND A.id_despesa = $1
                          AND B.status     = 'CANCELADA') AS itens_cancelados,
                      (SELECT COUNT(*)
                         FROM T_LEITURA_GAS
                        WHERE id_despesa = $1) AS leituras`;
  const uso = (await db.query(sql, [id])).rows[0];
  return {
    itensValidos: Number(uso.itens_validos),
    itensCancelados: Number(uso.itens_cancelados),
    leituras: Number(uso.leituras)
  };
};

// Filtros opcionais: ?mes=&ano= (da data_referencia), ?tipo_despesa=, ?ativo=
const listar = async ({ mes, ano, tipo_despesa, ativo } = {}) => {
  if (mes !== undefined && !(Number(mes) >= 1 && Number(mes) <= 12)) {
    throw new ErroApi(400, 'O mês deve estar entre 1 e 12.');
  }
  const sql = `SELECT ${COLUNAS}
                 FROM T_DESPESA
                WHERE ($1::INT     IS NULL OR EXTRACT(MONTH FROM data_referencia) = $1)
                  AND ($2::INT     IS NULL OR EXTRACT(YEAR  FROM data_referencia) = $2)
                  AND ($3::VARCHAR IS NULL OR tipo_despesa = $3)
                  AND ($4::BOOLEAN IS NULL OR ativo = $4)
                ORDER BY data_referencia DESC, descricao`;
  const result = await db.query(sql, [mes, ano, tipo_despesa, ativo]);
  return result.rows;
};

// Despesas fixas PREVISTAS para um mês (não grava nada): as FIXA ativas do mês anterior,
// com o valor de agora, no mesmo dia. São as que a geração das faturas do mês anterior vai
// lançar neste mês (ver faturaService.gerar). Só existem enquanto o mês anterior não foi
// gerado; depois disso a despesa já é real. A que já tem fixa com a mesma descrição no mês não entra.
const listarPrevistas = async ({ mes, ano } = {}) => {
  if (!(Number(mes) >= 1 && Number(mes) <= 12) || !ano) {
    throw new ErroApi(400, 'Informe o mês (1 a 12) e o ano.');
  }
  const sql = `SELECT A.id_despesa AS id_origem, A.descricao, A.tipo_despesa, A.valor_total, A.valor_m3,
                      (A.data_referencia + INTERVAL '1 month')::DATE AS data_referencia,
                      A.observacao,
                      EXTRACT(MONTH FROM A.data_referencia + INTERVAL '2 month')::INT AS mes_cobranca,
                      EXTRACT(YEAR  FROM A.data_referencia + INTERVAL '2 month')::INT AS ano_cobranca
                 FROM T_DESPESA A
                WHERE A.tipo_despesa = 'FIXA'
                  AND A.ativo        = TRUE
                  AND A.data_referencia >= MAKE_DATE($2::INT, $1::INT, 1) - INTERVAL '1 month'
                  AND A.data_referencia <  MAKE_DATE($2::INT, $1::INT, 1)
                  AND NOT EXISTS (SELECT 1
                                    FROM T_DESPESA B
                                   WHERE B.tipo_despesa = 'FIXA'
                                     AND B.ativo        = TRUE
                                     AND LOWER(TRIM(B.descricao)) = LOWER(TRIM(A.descricao))
                                     AND B.data_referencia >= MAKE_DATE($2::INT, $1::INT, 1)
                                     AND B.data_referencia <  MAKE_DATE($2::INT, $1::INT, 1) + INTERVAL '1 month')
                  AND NOT EXISTS (SELECT 1
                                    FROM T_FATURA F
                                   WHERE F.status <> 'CANCELADA'
                                     AND MAKE_DATE(F.ano_referencia, F.mes_referencia, 1)
                                         >= MAKE_DATE($2::INT, $1::INT, 1) - INTERVAL '1 month')
                ORDER BY A.data_referencia, A.descricao`;
  const result = await db.query(sql, [mes, ano]);
  return result.rows;
};

const buscarPorId = async (id) => {
  const sql = `SELECT ${COLUNAS}
                 FROM T_DESPESA
                WHERE id_despesa = $1`;
  const result = await db.query(sql, [id]);
  if (result.rowCount === 0) {
    throw new ErroApi(404, 'Despesa não encontrada.');
  }
  return result.rows[0];
};

const criar = async (dados = {}) => {
  const valores = prepararDados(dados);
  await validarMesAberto(valores[4]);

  const sql = `INSERT INTO T_DESPESA (descricao, tipo_despesa, valor_total, valor_m3, data_referencia, observacao)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING ${COLUNAS}`;
  const result = await db.query(sql, valores);
  return result.rows[0];
};

// Despesa já cobrada em fatura (não cancelada) ou com leituras de gás:
// só a descrição e a observação podem mudar. Para corrigir o valor,
// cancelar a fatura e gerar de novo.
const alterar = async (id, dados = {}) => {
  const valores = prepararDados(dados);
  const atual = await buscarPorId(id);
  const uso = await verificarUso(id);

  if (uso.itensValidos > 0 || uso.leituras > 0) {
    const mudouValor = atual.tipo_despesa !== valores[1]
      || atual.valor_total !== Number(valores[2])
      || atual.valor_m3 !== (valores[3] === null ? null : Number(valores[3]))
      || atual.data_referencia !== valores[4];
    if (mudouValor) {
      throw new ErroApi(409, 'Despesa já lançada em fatura ou com leituras de gás: só a descrição e a observação podem ser alteradas.');
    }
  }

  // Mudar a data para um mês já fechado também não pode
  if (atual.data_referencia !== valores[4]) {
    await validarMesAberto(valores[4]);
  }

  const sql = `UPDATE T_DESPESA
                  SET descricao       = $1,
                      tipo_despesa    = $2,
                      valor_total     = $3,
                      valor_m3        = $4,
                      data_referencia = $5,
                      observacao      = $6
                WHERE id_despesa = $7
            RETURNING ${COLUNAS}`;
  const result = await db.query(sql, [...valores, id]);
  return result.rows[0];
};

// RF8/RF9 pedem "excluir". Para o saldo do caixa não ficar errado:
//   - cobrada em fatura válida ou com leituras → não deixa
//   - só em faturas canceladas                 → apenas inativa (sai do saldo)
//   - nunca usada                              → exclui de verdade
const excluir = async (id) => {
  await buscarPorId(id);
  const uso = await verificarUso(id);

  if (uso.itensValidos > 0) {
    throw new ErroApi(409, 'Despesa já lançada em fatura. Cancele a fatura antes de excluir a despesa.');
  }
  if (uso.leituras > 0) {
    throw new ErroApi(409, 'Despesa de gás com leituras lançadas. Exclua as leituras antes de excluir a despesa.');
  }
  if (uso.itensCancelados > 0) {
    await db.query('UPDATE T_DESPESA SET ativo = FALSE WHERE id_despesa = $1', [id]);
    return 'A despesa aparece em faturas canceladas e foi inativada.';
  }

  await db.query('DELETE FROM T_DESPESA WHERE id_despesa = $1', [id]);
  return 'Despesa excluída.';
};

// Divide o valor igualmente (RN07). A conta é feita em centavos para não
// perder dinheiro com arredondamento: cada apto paga a parte inteira e o
// ÚLTIMO da lista recebe a diferença, para a soma bater com o total.
// Ex.: R$ 100,00 / 3 → 33,33 + 33,33 + 33,34
// Exportada para ser usada também na geração das faturas (parte 6).
const calcularRateio = (valorTotal, apartamentos) => {
  const totalCentavos = Math.round(valorTotal * 100);
  const parteCentavos = Math.floor(totalCentavos / apartamentos.length);
  const ultimo = apartamentos.length - 1;

  return apartamentos.map((apto, i) => {
    const centavos = i === ultimo ? totalCentavos - parteCentavos * ultimo : parteCentavos;
    return { ...apto, valor: centavos / 100 };
  });
};

// Prévia do rateio (não grava nada): quanto cada apartamento do mês da
// despesa vai pagar. Os itens são gravados na geração das faturas (parte 6).
const previaRateio = async (id) => {
  const despesa = await buscarPorId(id);
  if (despesa.valor_m3 !== null) {
    throw new ErroApi(400, 'Despesa de gás não é rateada: cada apartamento paga o próprio consumo (leituras de gás).');
  }
  if (!despesa.ativo) {
    throw new ErroApi(400, 'Despesa inativa não é rateada.');
  }

  const apartamentos = await apartamentoService.listarDoMes(despesa.data_referencia);
  if (apartamentos.length === 0) {
    throw new ErroApi(400, 'Não há apartamentos ativos para ratear a despesa.');
  }

  return {
    id_despesa: despesa.id_despesa,
    descricao: despesa.descricao,
    valor_total: despesa.valor_total,
    mes_cobranca: despesa.mes_cobranca,
    ano_cobranca: despesa.ano_cobranca,
    quantidade_apartamentos: apartamentos.length,
    apartamentos: calcularRateio(despesa.valor_total, apartamentos)
  };
};

module.exports = {
  listar,
  listarPrevistas,
  buscarPorId,
  criar,
  alterar,
  excluir,
  calcularRateio,
  previaRateio
};
