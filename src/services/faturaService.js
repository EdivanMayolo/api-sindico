const db = require('../configs');
const ErroApi = require('../utils/ErroApi');
const { textoOuNulo } = require('../utils/texto');
const apartamentoService = require('./apartamentoService');
const despesaService = require('./despesaService');

// A fatura é um "esboço" mensal de cada apartamento (não é boleto).
// mes_referencia/ano_referencia = mês DOS GASTOS (fatura "ref. 06/2026" é
// cobrada em julho). O valor_total é calculado pelo banco (trigger
// trg_atualiza_total_fatura) a cada item incluído ou removido.

// Dados de cobrança do esboço (vencimento, multa e juros). Valores padrão fixos aqui;
// para trocar sem mexer no código, informar no .env (o dia vai de 1 a 28).
const VENCIMENTO_DIA = Number(process.env.FATURA_VENCIMENTO_DIA || 15);
const MULTA_PERCENTUAL = Number(process.env.FATURA_MULTA_PERCENTUAL || 2);
const JUROS_MES_PERCENTUAL = Number(process.env.FATURA_JUROS_MES_PERCENTUAL || 1);

// Arredonda para centavos
const centavos = (valor) => Math.round(valor * 100) / 100;

// 6 e 2026 → '06/2026'
const mesAno =(mes, ano) => `${String(mes).padStart(2, '0')}/${ano}`;

// 'AAAA-MM-DD' → '06/2026'
const mesAnoDaData = (data) => `${data.slice(5, 7)}/${data.slice(0, 4)}`;

// 'AAAA-MM-DD' → 'DD/MM/AAAA' (só para o texto das mensagens)
const dataBr = (data) => data.split('-').reverse().join('/');

const nomeApto = (apto) => (apto.bloco ? `${apto.numero}-${apto.bloco}` : apto.numero);

// Filtros opcionais (RF17): ?id_apartamento=, ?mes=, ?ano=, ?status=
const listar = async ({ id_apartamento, mes, ano, status } = {}) => {
  const sql = `SELECT A.id_fatura, A.id_apartamento, B.numero, B.bloco,
                      A.mes_referencia, A.ano_referencia, A.data_geracao,
                      A.status, A.valor_total,
                      (SELECT COUNT(*)::INT FROM T_ITEM_FATURA C
                        WHERE C.id_fatura = A.id_fatura) AS quantidade_itens
                 FROM T_FATURA A, T_APARTAMENTO B
                WHERE A.id_apartamento = B.id_apartamento
                  AND ($1::INT     IS NULL OR A.id_apartamento = $1)
                  AND ($2::INT     IS NULL OR A.mes_referencia = $2)
                  AND ($3::INT     IS NULL OR A.ano_referencia = $3)
                  AND ($4::VARCHAR IS NULL OR A.status         = $4)
                ORDER BY A.ano_referencia DESC, A.mes_referencia DESC, B.bloco, B.numero`;
  const result = await db.query(sql, [id_apartamento, mes, ano, status]);
  return result.rows;
};

// Fatura com o apartamento, os dados de cobrança, o pagador e todos os itens.
// numero_documento = número da fatura com zeros (decisão 3A).
// data_vencimento  = dia VENCIMENTO_DIA do mês de cobrança, o seguinte ao de referência (decisão 2).
const buscarPorId = async (id) => {
  const sql = `SELECT A.id_fatura, A.id_apartamento, B.numero, B.bloco,
                      A.mes_referencia, A.ano_referencia, A.data_geracao,
                      A.status, A.valor_total,
                      LPAD(A.id_fatura::TEXT, 6, '0') AS numero_documento,
                      (MAKE_DATE(A.ano_referencia, A.mes_referencia, $2) + INTERVAL '1 month')::DATE
                        AS data_vencimento
                 FROM T_FATURA A, T_APARTAMENTO B
                WHERE A.id_apartamento = B.id_apartamento
                  AND A.id_fatura      = $1`;
  const result = await db.query(sql, [id, VENCIMENTO_DIA]);
  if (result.rowCount === 0) {
    throw new ErroApi(404, 'Fatura não encontrada.');
  }
  const fatura = result.rows[0];

  // Decisão 4A: multa e juros só como instrução do esboço (o sistema não cobra o atraso)
  fatura.cobranca = {
    multa_percentual: MULTA_PERCENTUAL,
    multa_valor: centavos(fatura.valor_total * MULTA_PERCENTUAL / 100),
    juros_mes_percentual: JUROS_MES_PERCENTUAL,
    juros_dia_valor: centavos(fatura.valor_total * JUROS_MES_PERCENTUAL / 100 / 30),
  };

  // Decisão 5A: pagador = o inquilino ativo, se houver; senão o proprietário
  // (entre vários, primeiro quem mora no apartamento). Vínculos ativos de hoje.
  const pagador = await db.query(
    `SELECT B.nome, B.cpf, B.endereco, A.tipo_vinculo
       FROM T_VINCULO_APARTAMENTO A, T_PESSOA B
      WHERE A.id_pessoa      = B.id_pessoa
        AND A.id_apartamento = $1
        AND A.ativo          = TRUE
      ORDER BY (A.tipo_vinculo = 'INQUILINO') DESC, A.reside DESC, B.nome
      LIMIT 1`,
    [fatura.id_apartamento]
  );
  fatura.pagador = pagador.rows[0] || null;

  // avulso = item sem despesa ligada (ex.: multa)
  const itens = await db.query(
    `SELECT id_item_fatura, id_despesa, descricao, valor,
            (id_despesa IS NULL) AS avulso
       FROM T_ITEM_FATURA
      WHERE id_fatura = $1
      ORDER BY id_item_fatura`,
    [id]
  );
  fatura.itens = itens.rows;
  return fatura;
};

// Despesas ainda NÃO faturadas até o fim do mês: as do próprio mês e as de
// meses anteriores lançadas depois que aquelas faturas foram geradas
// (decisão 4: entram automaticamente no rateio do mês seguinte).
// "Faturada" = tem item em fatura não cancelada.
const listarDespesasPendentes = async (fimDoMes) => {
  const sql = `SELECT D.id_despesa, D.descricao, D.valor_total, D.valor_m3, D.data_referencia
                 FROM T_DESPESA D
                WHERE D.ativo           = TRUE
                  AND D.data_referencia <= $1
                  AND NOT EXISTS (SELECT 1
                                    FROM T_ITEM_FATURA I, T_FATURA F
                                   WHERE I.id_fatura  = F.id_fatura
                                     AND I.id_despesa = D.id_despesa
                                     AND F.status    <> 'CANCELADA')
                ORDER BY D.data_referencia, D.id_despesa`;
  return (await db.query(sql, [fimDoMes])).rows;
};

// Decisão 2A: despesa de gás só é faturada com TODAS as leituras do mês dela
// finalizadas (todos os aptos daquele mês lidos).
const validarGasCompleto = async (despesa) => {
  const aptosDoMes = await apartamentoService.listarDoMes(despesa.data_referencia);
  const sql = `SELECT COUNT(*)::INT AS leituras,
                      COUNT(*) FILTER (WHERE finalizada = TRUE)::INT AS finalizadas
                 FROM T_LEITURA_GAS
                WHERE id_despesa = $1`;
  const { leituras, finalizadas } = (await db.query(sql, [despesa.id_despesa])).rows[0];
  if (finalizadas < leituras || finalizadas < aptosDoMes.length) {
    throw new ErroApi(409, `Finalize as leituras de gás de ${mesAnoDaData(despesa.data_referencia)} antes de gerar as faturas.`);
  }
};

// Decisão 1A: gera a fatura de TODOS os apartamentos do mês de uma vez,
// numa transação (se algo falhar, nenhuma fatura fica gravada).
const gerar = async ({ mes, ano } = {}) => {
  if (!(Number(mes) >= 1 && Number(mes) <= 12) || !(Number(ano) >= 2000)) {
    throw new ErroApi(400, 'Informe o mês (1 a 12) e o ano das faturas.');
  }
  const ref = mesAno(mes, ano);

  // Os gastos do mês só fecham quando o mês termina: a fatura de 06/2026
  // pode ser gerada a partir de 01/07/2026.
  const datas = (await db.query(
    `SELECT (MAKE_DATE($2::INT, $1::INT, 1) + INTERVAL '1 month - 1 day')::DATE AS fim,
            (MAKE_DATE($2::INT, $1::INT, 1) + INTERVAL '1 month')::DATE         AS libera,
            CURRENT_DATE >= (MAKE_DATE($2::INT, $1::INT, 1) + INTERVAL '1 month')::DATE AS pode`,
    [mes, ano]
  )).rows[0];
  if (!datas.pode) {
    throw new ErroApi(409, `As faturas de ${ref} só podem ser geradas a partir de ${dataBr(datas.libera)}, depois que o mês terminar.`);
  }

  const existentes = await db.query(
    `SELECT 1 FROM T_FATURA
      WHERE mes_referencia = $1 AND ano_referencia = $2 AND status <> 'CANCELADA'
      LIMIT 1`,
    [mes, ano]
  );
  if (existentes.rowCount > 0) {
    throw new ErroApi(409, `As faturas de ${ref} já foram geradas.`);
  }

  // Decisão 3A: aptos ativos cadastrados até o último dia do mês
  const apartamentos = await apartamentoService.listarDoMes(datas.fim);
  if (apartamentos.length === 0) {
    throw new ErroApi(400, `Não há apartamentos cadastrados até ${ref}.`);
  }

  const pendentes = await listarDespesasPendentes(datas.fim);
  if (pendentes.length === 0) {
    throw new ErroApi(400, `Não há despesas a faturar até ${ref}.`);
  }
  for (const despesa of pendentes.filter((d) => d.valor_m3 !== null)) {
    await validarGasCompleto(despesa);
  }

  // Despesa de outro mês (lançada depois que aquele mês fechou) leva a referência no texto
  const descricaoItem = (despesa, texto) => (mesAnoDaData(despesa.data_referencia) === ref
    ? texto
    : `${texto} (ref. ${mesAnoDaData(despesa.data_referencia)})`);

  await db.transacao(async (client) => {
    // 1. Uma fatura (ABERTA) para cada apartamento do mês
    const faturaDoApto = {};
    for (const apto of apartamentos) {
      const result = await client.query(
        `INSERT INTO T_FATURA (id_apartamento, mes_referencia, ano_referencia)
         VALUES ($1, $2, $3)
         RETURNING id_fatura`,
        [apto.id_apartamento, mes, ano]
      );
      faturaDoApto[apto.id_apartamento] = result.rows[0].id_fatura;
    }

    const inserirItem = (idApartamento, despesa, texto, valor) => client.query(
      `INSERT INTO T_ITEM_FATURA (id_fatura, id_despesa, descricao, valor)
       VALUES ($1, $2, $3, $4)`,
      [faturaDoApto[idApartamento], despesa.id_despesa, descricaoItem(despesa, texto), valor]
    );

    for (const despesa of pendentes) {
      if (despesa.valor_m3 === null) {
        // 2. Despesa comum: rateio igual entre os aptos do mês (RN07)
        const partes = despesaService.calcularRateio(despesa.valor_total, apartamentos);
        for (const parte of partes) {
          await inserirItem(parte.id_apartamento, despesa, despesa.descricao, parte.valor);
        }
      } else {
        // 3. Gás: cada apto paga o próprio consumo (RN06). A diferença para
        //    a conta não é cobrada (decisão 8B da parte 5).
        const leituras = await client.query(
          `SELECT id_apartamento, consumo, valor
             FROM T_LEITURA_GAS
            WHERE id_despesa = $1
              AND finalizada = TRUE`,
          [despesa.id_despesa]
        );
        for (const leitura of leituras.rows) {
          if (faturaDoApto[leitura.id_apartamento]) {
            const consumo = String(leitura.consumo).replace('.', ',');
            await inserirItem(leitura.id_apartamento, despesa, `${despesa.descricao} - consumo ${consumo} m³`, leitura.valor);
          }
        }
      }
    }
  });

  // Devolve as faturas válidas do mês (as canceladas continuam na consulta geral)
  return (await listar({ mes, ano })).filter((f) => f.status !== 'CANCELADA');
};

const exigirAberta = (fatura) => {
  if (fatura.status !== 'ABERTA') {
    throw new ErroApi(409, `A fatura está ${fatura.status}: só fatura ABERTA pode ter itens alterados.`);
  }
};

// Decisão 7A: item avulso (multa, taxa extra...), só em fatura ABERTA
const adicionarItem = async (idFatura, { descricao, valor } = {}) => {
  if (!textoOuNulo(descricao) || valor === undefined || valor === null || valor === '') {
    throw new ErroApi(400, 'Informe a descrição e o valor do item.');
  }
  exigirAberta(await buscarPorId(idFatura));

  await db.query(
    `INSERT INTO T_ITEM_FATURA (id_fatura, id_despesa, descricao, valor)
     VALUES ($1, NULL, $2, $3)`,
    [idFatura, textoOuNulo(descricao), valor]
  );
  return buscarPorId(idFatura);
};

// Só itens avulsos podem ser removidos: os de despesa fazem parte do rateio
const removerItem = async (idFatura, idItem) => {
  const fatura = await buscarPorId(idFatura);
  const item = fatura.itens.find((i) => i.id_item_fatura === Number(idItem));
  if (!item) {
    throw new ErroApi(404, 'Item não encontrado nesta fatura.');
  }
  if (!item.avulso) {
    throw new ErroApi(409, 'Item de despesa não pode ser removido (faz parte do rateio). Só itens avulsos podem ser removidos.');
  }
  exigirAberta(fatura);

  await db.query('DELETE FROM T_ITEM_FATURA WHERE id_item_fatura = $1', [idItem]);
  return buscarPorId(idFatura);
};

// ---------------------------------------------------------------------
// STATUS DA FATURA — PRONTO, MAS DESATIVADO (decisões 5A e 6A: trabalho
// futuro; a fatura é um esboço e, por enquanto, fica sempre ABERTA).
// Para ativar: descomentar a rota PATCH /:id/status em faturaRouter.js.
//
//   ABERTA  →  EMITIDA  →  PAGA
//      ↘          ↘
//      CANCELADA  CANCELADA
//
// - EMITIDA: entregue ao morador; itens travados.
// - PAGA: marcado à mão pelo síndico; cria a receita do pagamento (6A).
// - CANCELADA: as despesas dela voltam a ficar "não faturadas" e entram
//   na próxima geração (o mês pode ser gerado de novo).
// ---------------------------------------------------------------------
const TRANSICOES = {
  ABERTA: ['EMITIDA', 'CANCELADA'],
  EMITIDA: ['PAGA', 'CANCELADA'],
  PAGA: [],
  CANCELADA: []
};

const alterarStatus = async (id, { status, data_pagamento } = {}) => {
  const fatura = await buscarPorId(id);
  if (!TRANSICOES[fatura.status].includes(status)) {
    const permitidos = TRANSICOES[fatura.status];
    throw new ErroApi(409, permitidos.length === 0
      ? `Fatura ${fatura.status} não pode mudar de status.`
      : `Fatura ${fatura.status} só pode passar para: ${permitidos.join(' ou ')}.`);
  }

  await db.transacao(async (client) => {
    await client.query('UPDATE T_FATURA SET status = $1 WHERE id_fatura = $2', [status, id]);

    // 6A: o pagamento já entra no caixa como receita (vw_saldo)
    if (status === 'PAGA') {
      await client.query(
        `INSERT INTO T_RECEITA (descricao, valor, data_recebimento)
         VALUES ($1, $2, COALESCE($3::DATE, CURRENT_DATE))`,
        [`Pagamento fatura ${mesAno(fatura.mes_referencia, fatura.ano_referencia)} - Apto ${nomeApto(fatura)}`, fatura.valor_total, data_pagamento ?? null]
      );
    }
  });
  return buscarPorId(id);
};

module.exports = {
  listar,
  buscarPorId,
  gerar,
  adicionarItem,
  removerItem,
  alterarStatus
};
