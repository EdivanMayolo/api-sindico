const db = require('../configs');
const ErroApi = require('../utils/ErroApi');
const { textoOuNulo } = require('../utils/texto');
const vinculoService = require('./vinculoService');

// REGRA DOS 5 DIAS (pronta, mas DESATIVADA — ver criar()):
// todos os apartamentos são cadastrados em até 5 dias, contando o dia do
// primeiro cadastro como dia 1 (ex.: 1º em 28/06 → último dia 02/07).
// Depois disso, nenhum apartamento novo pode ser cadastrado.
const DIAS_PRAZO_CADASTRO = 5;

// 'AAAA-MM-DD' → 'DD/MM/AAAA' (só para o texto das mensagens)
const dataBr = (data) => data.split('-').reverse().join('/');

// Período de cadastro: começa no 1º apartamento cadastrado.
// Sem nenhum apartamento ainda, está aberto (o 1º cadastro inicia o prazo).
const periodoCadastro = async () => {
  const sql = `SELECT MIN(data_cadastro)                    AS inicio,
                      MIN(data_cadastro) + ($1::INT - 1)    AS fim,
                      COALESCE(CURRENT_DATE <= MIN(data_cadastro) + ($1::INT - 1), TRUE) AS aberto
                 FROM T_APARTAMENTO`;
  const result = await db.query(sql, [DIAS_PRAZO_CADASTRO]);
  return result.rows[0];
};

// Lista com os nomes dos proprietários e moradores ativos de cada apto.
// Filtro opcional ?ativo=true|false
const listar = async ({ ativo } = {}) => {
  const sql = `SELECT A.id_apartamento, A.numero, A.bloco, A.andar, A.data_cadastro, A.ativo,
                      (SELECT STRING_AGG(C.nome, ', ')
                         FROM T_VINCULO_APARTAMENTO B, T_PESSOA C
                        WHERE B.id_pessoa      = C.id_pessoa
                          AND B.id_apartamento = A.id_apartamento
                          AND B.tipo_vinculo   = 'PROPRIETARIO'
                          AND B.ativo          = TRUE) AS proprietarios,
                      (SELECT STRING_AGG(C.nome, ', ')
                         FROM T_VINCULO_APARTAMENTO B, T_PESSOA C
                        WHERE B.id_pessoa      = C.id_pessoa
                          AND B.id_apartamento = A.id_apartamento
                          AND B.reside         = TRUE
                          AND B.ativo          = TRUE) AS moradores
                 FROM T_APARTAMENTO A
                WHERE ($1::BOOLEAN IS NULL OR A.ativo = $1)
                ORDER BY A.bloco, A.numero`;
  const result = await db.query(sql, [ativo]);
  return result.rows;
};

// Dados do apartamento + vínculos ativos (quem é dono, quem aluga, quem mora)
const buscarPorId = async (id) => {
  const sql = `SELECT id_apartamento, numero, bloco, andar, data_cadastro, ativo
                 FROM T_APARTAMENTO
                WHERE id_apartamento = $1`;
  const result = await db.query(sql, [id]);
  if (result.rowCount === 0) {
    throw new ErroApi(404, 'Apartamento não encontrado.');
  }
  const apartamento = result.rows[0];
  apartamento.vinculos = await vinculoService.listar({ id_apartamento: id, ativo: true });
  return apartamento;
};

// Regra do condomínio: todo apartamento ativo tem um proprietário ativo.
// Por isso o apartamento já é cadastrado com o proprietário, numa transação:
// se o vínculo falhar, o apartamento também não é gravado.
const criar = async ({ numero, bloco, andar, id_pessoa_proprietario, reside } = {}) => {
  if (!textoOuNulo(numero)) {
    throw new ErroApi(400, 'Informe o número do apartamento.');
  }
  if (!id_pessoa_proprietario) {
    throw new ErroApi(400, 'Informe o proprietário do apartamento (id_pessoa_proprietario).');
  }

  // REGRA DOS 5 DIAS — DESATIVADA (decisão do Edivan: pronta, mas fora de uso).
  // Para ativar: descomentar as 4 linhas abaixo e a rota /periodo-cadastro
  // em routers/apartamentoRouter.js.
  // const periodo = await periodoCadastro();
  // if (!periodo.aberto) {
  //   throw new ErroApi(409, `O período de cadastro de apartamentos terminou em ${dataBr(periodo.fim)}. Não é possível cadastrar novos apartamentos.`);
  // }

  // data_cadastro = data do dia (DEFAULT do banco)
  return db.transacao(async (client) => {
    const sql = `INSERT INTO T_APARTAMENTO (numero, bloco, andar)
                 VALUES ($1, $2, $3)
                 RETURNING id_apartamento, numero, bloco, andar, data_cadastro, ativo`;
    const result = await client.query(sql, [textoOuNulo(numero), textoOuNulo(bloco), textoOuNulo(andar)]);
    const apartamento = result.rows[0];

    const vinculo = await vinculoService.inserir(client, {
      id_pessoa: id_pessoa_proprietario,
      id_apartamento: apartamento.id_apartamento,
      tipo_vinculo: 'PROPRIETARIO',
      reside
    });
    apartamento.vinculos = [vinculo];
    return apartamento;
  });
};

const alterar = async (id, { numero, bloco, andar } = {}) => {
  if (!textoOuNulo(numero)) {
    throw new ErroApi(400, 'Informe o número do apartamento.');
  }

  const sql = `UPDATE T_APARTAMENTO
                  SET numero = $1,
                      bloco  = $2,
                      andar  = $3
                WHERE id_apartamento = $4
            RETURNING id_apartamento, numero, bloco, andar, data_cadastro, ativo`;
  const result = await db.query(sql, [textoOuNulo(numero), textoOuNulo(bloco), textoOuNulo(andar), id]);
  if (result.rowCount === 0) {
    throw new ErroApi(404, 'Apartamento não encontrado.');
  }
  return result.rows[0];
};

// RN01: apartamento não é excluído, só inativado (sai do rateio, RN07).
// O proprietário continua dono; mas não pode haver inquilino ativo.
const inativar = async (id) => {
  const apartamento = await buscarPorId(id);
  if (!apartamento.ativo) {
    throw new ErroApi(400, 'O apartamento já está inativo.');
  }
  const temInquilino = apartamento.vinculos.some((v) => v.tipo_vinculo === 'INQUILINO');
  if (temInquilino) {
    throw new ErroApi(409, 'O apartamento possui inquilino ativo. Encerre o vínculo do inquilino antes de inativar.');
  }

  const sql = `UPDATE T_APARTAMENTO
                  SET ativo = FALSE
                WHERE id_apartamento = $1
            RETURNING id_apartamento, numero, bloco, andar, data_cadastro, ativo`;
  const result = await db.query(sql, [id]);
  return result.rows[0];
};

// Para voltar a ser ativo, precisa ter proprietário ativo (regra do condomínio)
const ativar = async (id) => {
  const apartamento = await buscarPorId(id);
  if (apartamento.ativo) {
    throw new ErroApi(400, 'O apartamento já está ativo.');
  }
  const temProprietario = apartamento.vinculos.some((v) => v.tipo_vinculo === 'PROPRIETARIO');
  if (!temProprietario) {
    throw new ErroApi(409, 'Cadastre um proprietário para o apartamento antes de reativá-lo.');
  }

  const sql = `UPDATE T_APARTAMENTO
                  SET ativo = TRUE
                WHERE id_apartamento = $1
            RETURNING id_apartamento, numero, bloco, andar, data_cadastro, ativo`;
  const result = await db.query(sql, [id]);
  return result.rows[0];
};

module.exports = {
  periodoCadastro,
  listar,
  buscarPorId,
  criar,
  alterar,
  inativar,
  ativar
};
