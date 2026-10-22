const db = require('../configs');
const ErroApi = require('../utils/ErroApi');
const despesaService = require('./despesaService');

// O cálculo pesado fica no banco (trigger trg_leitura_gas): leitura anterior
// automática, consumo, valor ao finalizar e trava da leitura finalizada.
// Aqui ficam as regras do fluxo da tela de leitura (decididas com o Edivan):
//   - os apartamentos são lidos EM ORDEM (bloco, número): o próximo só começa
//     quando o anterior estiver finalizado;
//   - um mês novo só começa quando o mês anterior estiver completo;
//   - não existe leitura retroativa (mês anterior a um que já tem leituras);
//   - a data da leitura é sempre a data do dia (não é digitada).

const COLUNAS = `A.id_leitura_gas, A.id_despesa, A.id_apartamento, C.numero, C.bloco,
                 A.data_leitura, A.leitura_anterior, A.leitura_atual, A.consumo,
                 A.valor_m3, A.valor, A.troca_relogio, A.finalizada`;

// 'AAAA-MM-DD' → 'MM/AAAA' (para as mensagens)
const mesAno = (data) => `${data.slice(5, 7)}/${data.slice(0, 4)}`;

const nomeApto = (apto) => (apto.bloco ? `${apto.numero}-${apto.bloco}` : apto.numero);

const buscarDespesaGas = async (idDespesa) => {
  const despesa = await despesaService.buscarPorId(idDespesa);
  if (despesa.valor_m3 === null) {
    throw new ErroApi(400, 'Esta despesa não é de gás (não tem o valor do m³).');
  }
  if (!despesa.ativo) {
    throw new ErroApi(400, 'Despesa inativa não recebe leituras.');
  }
  return despesa;
};

const buscarPorId = async (id) => {
  const sql = `SELECT ${COLUNAS}
                 FROM T_LEITURA_GAS A, T_APARTAMENTO C
                WHERE A.id_apartamento = C.id_apartamento
                  AND A.id_leitura_gas = $1`;
  const result = await db.query(sql, [id]);
  if (result.rowCount === 0) {
    throw new ErroApi(404, 'Leitura de gás não encontrada.');
  }
  return result.rows[0];
};

// Aptos que fazem parte da leitura de um mês, em ordem (bloco, número).
// Virada de mês: o apto só entra se foi cadastrado ATÉ o dia em que as
// leituras daquele mês começaram (inicioLeituras). Cadastrado depois, entra
// no mês seguinte. Mês ainda não começado (inicioLeituras null): todos.
const listarAptosDoMes = async (inicioLeituras) => {
  const sql = `SELECT id_apartamento, numero, bloco, data_cadastro
                 FROM T_APARTAMENTO
                WHERE ativo = TRUE
                  AND ($1::DATE IS NULL OR data_cadastro <= $1)
                ORDER BY bloco, numero`;
  return (await db.query(sql, [inicioLeituras])).rows;
};

// Painel da tela de leitura de uma despesa de gás: os apartamentos do mês,
// em ordem, com a leitura deste mês (se já lançada) e a última leitura
// finalizada (que será a leitura anterior, bloqueada no Quasar).
const painel = async (idDespesa) => {
  const despesa = await buscarDespesaGas(idDespesa);

  const leituras = (await db.query(
    `SELECT ${COLUNAS}
       FROM T_LEITURA_GAS A, T_APARTAMENTO C
      WHERE A.id_apartamento = C.id_apartamento
        AND A.id_despesa     = $1`,
    [idDespesa]
  )).rows;

  // Dia em que as leituras deste mês começaram (a mais antiga)
  const inicioLeituras = leituras.length > 0
    ? leituras.map((l) => l.data_leitura).sort()[0]
    : null;
  const apartamentos = await listarAptosDoMes(inicioLeituras);

  // Última leitura finalizada de cada apto em OUTRAS despesas (mesma ordem da trigger)
  const ultimas = (await db.query(
    `SELECT DISTINCT ON (id_apartamento) id_apartamento, leitura_atual, data_leitura
       FROM T_LEITURA_GAS
      WHERE finalizada = TRUE
        AND id_despesa <> $1
      ORDER BY id_apartamento, data_leitura DESC, id_leitura_gas DESC`,
    [idDespesa]
  )).rows;

  const lista = apartamentos.map((apto) => {
    const leitura = leituras.find((l) => l.id_apartamento === apto.id_apartamento) || null;
    const ultima = ultimas.find((u) => u.id_apartamento === apto.id_apartamento) || null;
    return {
      ...apto,
      situacao: !leitura ? 'PENDENTE' : (leitura.finalizada ? 'FINALIZADA' : 'EM_ANDAMENTO'),
      leitura,
      ultima_leitura_finalizada: ultima,
      // Com leitura finalizada anterior, o campo vem preenchido e bloqueado
      // (só a troca de relógio libera a digitação)
      leitura_anterior_bloqueada: ultima !== null
    };
  });

  const finalizadas = lista.filter((a) => a.situacao === 'FINALIZADA');
  const totalCentavos = finalizadas.reduce((t, a) => t + Math.round(a.leitura.valor * 100), 0);
  const proximo = lista.find((a) => a.situacao !== 'FINALIZADA') || null;

  return {
    id_despesa: despesa.id_despesa,
    descricao: despesa.descricao,
    data_referencia: despesa.data_referencia,
    valor_m3: despesa.valor_m3,
    inicio_leituras: inicioLeituras,
    total_apartamentos: lista.length,
    total_finalizadas: finalizadas.length,
    completa: lista.length > 0 && finalizadas.length === lista.length,
    proximo_apartamento: proximo && { id_apartamento: proximo.id_apartamento, numero: proximo.numero, bloco: proximo.bloco },
    // Decisão 8B: a diferença NÃO é cobrada; o Quasar mostra um alerta quando for diferente de zero
    valor_conta: despesa.valor_total,
    total_consumo: totalCentavos / 100,
    diferenca: (Math.round(despesa.valor_total * 100) - totalCentavos) / 100,
    apartamentos: lista
  };
};

// Regras de calendário (entre meses), conferidas antes de lançar uma leitura.
// iniciandoMes = a despesa ainda não tem nenhuma leitura (é a 1ª do mês).
const validarMes = async (despesa, iniciandoMes) => {
  // aptos_do_mes: aptos ativos cadastrados até o 1º dia de leitura daquele mês
  const sql = `SELECT D.id_despesa, D.data_referencia,
                      (SELECT COUNT(*) FROM T_APARTAMENTO P
                        WHERE P.ativo = TRUE
                          AND P.data_cadastro <= (SELECT MIN(A.data_leitura) FROM T_LEITURA_GAS A
                                                   WHERE A.id_despesa = D.id_despesa)) AS aptos_do_mes,
                      (SELECT COUNT(*) FROM T_LEITURA_GAS A
                        WHERE A.id_despesa = D.id_despesa) AS leituras,
                                    (SELECT COUNT(*) FROM T_LEITURA_GAS A
                                      WHERE A.id_despesa = D.id_despesa
                                        AND A.finalizada = TRUE) AS finalizadas
                 FROM T_DESPESA D
                WHERE D.valor_m3   IS NOT NULL
                  AND D.ativo      = TRUE
                  AND D.id_despesa <> $1
                ORDER BY D.data_referencia`;
  const outras = (await db.query(sql, [despesa.id_despesa])).rows;

  // Sem leitura retroativa: um mês posterior já tem leituras
  const posterior = outras.find((d) => d.data_referencia > despesa.data_referencia && Number(d.leituras) > 0);
  if (posterior) {
    throw new ErroApi(409, `Já existem leituras de ${mesAno(posterior.data_referencia)}. Não é permitido lançar leitura em mês anterior.`);
  }

  // Para COMEÇAR um mês novo, o último mês com leituras precisa estar completo:
  // todas finalizadas e todos os aptos DAQUELE mês lidos (um apto cadastrado
  // depois que aquele mês começou não conta para ele — entra no mês seguinte).
  if (!iniciandoMes) {
    return;
  }
  const anteriores = outras.filter((d) => d.data_referencia < despesa.data_referencia && Number(d.leituras) > 0);
  const ultimo = anteriores[anteriores.length - 1];
  const incompleto = ultimo && (Number(ultimo.finalizadas) < Number(ultimo.leituras) || Number(ultimo.finalizadas) < Number(ultimo.aptos_do_mes)) ? ultimo : null;
  if (incompleto) {
    throw new ErroApi(409, `Finalize as leituras de ${mesAno(incompleto.data_referencia)} antes de começar um novo mês.`);
  }
};

const criar = async ({ id_despesa, id_apartamento, leitura_atual, leitura_anterior, troca_relogio } = {}) => {
  if (!id_despesa || !id_apartamento || leitura_atual === undefined || leitura_atual === null || leitura_atual === '') {
    throw new ErroApi(400, 'Informe a despesa de gás, o apartamento e a leitura atual do relógio.');
  }

  const situacao = await painel(id_despesa);
  await validarMes(situacao, situacao.apartamentos.every((a) => !a.leitura));

  // Ordem dos apartamentos: só o próximo da fila pode ser lido
  const apto = situacao.apartamentos.find((a) => a.id_apartamento === Number(id_apartamento));
  if (!apto) {
    const existe = await db.query('SELECT ativo FROM T_APARTAMENTO WHERE id_apartamento = $1', [id_apartamento]);
    if (existe.rowCount === 0 || !existe.rows[0].ativo) {
      throw new ErroApi(404, 'Apartamento não encontrado ou inativo.');
    }
    throw new ErroApi(409, 'Este apartamento foi cadastrado depois que as leituras deste mês começaram. A leitura dele começa no próximo mês.');
  }
  if (apto.leitura) {
    throw new ErroApi(409, 'Este apartamento já possui leitura de gás nesta despesa.');
  }
  if (situacao.proximo_apartamento.id_apartamento !== apto.id_apartamento) {
    throw new ErroApi(409, `Finalize a leitura do apartamento ${nomeApto(situacao.proximo_apartamento)} antes de lançar a do ${nomeApto(apto)}.`);
  }

  // data_leitura = data do dia (CURRENT_DATE); a leitura anterior é tratada pela trigger
  const sql = `INSERT INTO T_LEITURA_GAS (id_despesa, id_apartamento, data_leitura, leitura_anterior, leitura_atual, troca_relogio)
               VALUES ($1, $2, CURRENT_DATE, $3, $4, COALESCE($5, FALSE))
               RETURNING id_leitura_gas`;
  const result = await db.query(sql, [id_despesa, id_apartamento, leitura_anterior ?? null, leitura_atual, troca_relogio]);
  return buscarPorId(result.rows[0].id_leitura_gas);
};

// Correção enquanto não finalizada (a trigger bloqueia as finalizadas).
// A data da leitura passa a ser a data do dia da correção.
const alterar = async (id, { leitura_atual, leitura_anterior, troca_relogio } = {}) => {
  if (leitura_atual === undefined || leitura_atual === null || leitura_atual === '') {
    throw new ErroApi(400, 'Informe a leitura atual do relógio.');
  }
  const leitura = await buscarPorId(id);
  if (leitura.finalizada) {
    throw new ErroApi(400, 'Leitura de gás já finalizada não pode ser alterada.');
  }

  const sql = `UPDATE T_LEITURA_GAS
                  SET leitura_atual    = $1,
                      leitura_anterior = COALESCE($2, leitura_anterior),
                      troca_relogio    = COALESCE($3, troca_relogio),
                      data_leitura     = CURRENT_DATE
                WHERE id_leitura_gas = $4`;
  await db.query(sql, [leitura_atual, leitura_anterior ?? null, troca_relogio, id]);
  return buscarPorId(id);
};

// Botão "Finalizar": a trigger calcula valor = consumo x valor do m³ e trava a leitura
const finalizar = async (id) => {
  const leitura = await buscarPorId(id);
  if (leitura.finalizada) {
    throw new ErroApi(400, 'Esta leitura já está finalizada.');
  }
  await db.query('UPDATE T_LEITURA_GAS SET finalizada = TRUE WHERE id_leitura_gas = $1', [id]);
  return buscarPorId(id);
};

// Só leitura não finalizada (a trigger bloqueia as finalizadas)
const excluir = async (id) => {
  const leitura = await buscarPorId(id);
  if (leitura.finalizada) {
    throw new ErroApi(400, 'Leitura de gás já finalizada não pode ser excluída.');
  }
  await db.query('DELETE FROM T_LEITURA_GAS WHERE id_leitura_gas = $1', [id]);
};

module.exports = {
  buscarPorId,
  painel,
  criar,
  alterar,
  finalizar,
  excluir
};
