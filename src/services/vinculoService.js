const db = require('../configs');
const ErroApi = require('../utils/ErroApi');

// Lista vínculos com o nome da pessoa e o número do apartamento.
// Filtros opcionais (?id_apartamento=, ?id_pessoa=, ?ativo=). Filtro não
// informado vira NULL e a condição "$1 IS NULL OR ..." deixa passar tudo.
const listar = async ({ id_apartamento, id_pessoa, ativo } = {}) => {
  const sql = `SELECT A.id_vinculo, A.id_apartamento, C.numero, C.bloco,
                      A.id_pessoa, B.nome, A.tipo_vinculo, A.reside,
                      A.data_inicio, A.data_fim, A.ativo
                 FROM T_VINCULO_APARTAMENTO A, T_PESSOA B, T_APARTAMENTO C
                WHERE A.id_pessoa      = B.id_pessoa
                  AND A.id_apartamento = C.id_apartamento
                  AND ($1::INT     IS NULL OR A.id_apartamento = $1)
                  AND ($2::INT     IS NULL OR A.id_pessoa      = $2)
                  AND ($3::BOOLEAN IS NULL OR A.ativo          = $3)
                ORDER BY C.bloco, C.numero, A.ativo DESC, A.data_inicio DESC`;
  const result = await db.query(sql, [id_apartamento, id_pessoa, ativo]);
  return result.rows;
};

const buscarPorId = async (id) => {
  const sql = `SELECT A.id_vinculo, A.id_apartamento, C.numero, C.bloco,
                      A.id_pessoa, B.nome, A.tipo_vinculo, A.reside,
                      A.data_inicio, A.data_fim, A.ativo
                 FROM T_VINCULO_APARTAMENTO A, T_PESSOA B, T_APARTAMENTO C
                WHERE A.id_pessoa      = B.id_pessoa
                  AND A.id_apartamento = C.id_apartamento
                  AND A.id_vinculo     = $1`;
  const result = await db.query(sql, [id]);
  if (result.rowCount === 0) {
    throw new ErroApi(404, 'Vínculo não encontrado.');
  }
  return result.rows[0];
};

// Valida e grava um vínculo. Recebe quem executa o SQL ("executor"):
//   - db       → gravação simples (POST /vinculos)
//   - client   → dentro de uma transação (cadastro do apartamento já com o proprietário)
const inserir = async (executor, { id_pessoa, id_apartamento, tipo_vinculo, reside, data_inicio } = {}) => {
  if (!id_pessoa || !id_apartamento || !tipo_vinculo) {
    throw new ErroApi(400, 'Informe a pessoa, o apartamento e o tipo de vínculo.');
  }

  const pessoa = await executor.query('SELECT ativo FROM T_PESSOA WHERE id_pessoa = $1', [id_pessoa]);
  if (pessoa.rowCount === 0) {
    throw new ErroApi(404, 'Pessoa não encontrada.');
  }
  if (!pessoa.rows[0].ativo) {
    throw new ErroApi(400, 'Pessoa inativa não pode receber vínculo.');
  }

  // Apartamento inativo só pode receber PROPRIETARIO (troca de dono de um apto
  // inativo, ou cadastrar o dono antes de reativá-lo). Inquilino, não.
  const apto = await executor.query('SELECT ativo FROM T_APARTAMENTO WHERE id_apartamento = $1', [id_apartamento]);
  if (apto.rowCount === 0) {
    throw new ErroApi(404, 'Apartamento não encontrado.');
  }
  if (!apto.rows[0].ativo && tipo_vinculo !== 'PROPRIETARIO') {
    throw new ErroApi(400, 'Apartamento inativo não pode receber inquilino.');
  }

  const repetido = await executor.query(
    `SELECT 1
       FROM T_VINCULO_APARTAMENTO
      WHERE id_pessoa      = $1
        AND id_apartamento = $2
        AND ativo          = TRUE`,
    [id_pessoa, id_apartamento]
  );
  if (repetido.rowCount > 0) {
    throw new ErroApi(409, 'Esta pessoa já possui vínculo ativo com este apartamento.');
  }

  // RN03 (inquilino em um só apto) e RN04 (tipo válido) são garantidas pelo banco
  const sql = `INSERT INTO T_VINCULO_APARTAMENTO (id_pessoa, id_apartamento, tipo_vinculo, reside, data_inicio)
               VALUES ($1, $2, $3, COALESCE($4, FALSE), COALESCE($5, CURRENT_DATE))
               RETURNING id_vinculo, id_pessoa, id_apartamento, tipo_vinculo, reside, data_inicio, data_fim, ativo`;
  const result = await executor.query(sql, [id_pessoa, id_apartamento, tipo_vinculo, reside, data_inicio]);
  return result.rows[0];
};

const criar = async (dados) => {
  return inserir(db, dados);
};

// Só corrige quem mora (reside) e a data de início de um vínculo ativo.
// Trocar pessoa, apartamento ou tipo = encerrar este vínculo e criar outro (histórico).
const alterar = async (id, { reside, data_inicio } = {}) => {
  if (typeof reside !== 'boolean') {
    throw new ErroApi(400, 'Informe se a pessoa reside no apartamento (reside: true ou false).');
  }
  const vinculo = await buscarPorId(id);
  if (!vinculo.ativo) {
    throw new ErroApi(400, 'Vínculo encerrado não pode ser alterado.');
  }

  const sql = `UPDATE T_VINCULO_APARTAMENTO
                  SET reside      = $1,
                      data_inicio = COALESCE($2, data_inicio)
                WHERE id_vinculo = $3
            RETURNING id_vinculo, id_pessoa, id_apartamento, tipo_vinculo, reside, data_inicio, data_fim, ativo`;
  const result = await db.query(sql, [reside, data_inicio, id]);
  return result.rows[0];
};

// Encerrar = fim do vínculo, que fica no histórico (nunca é apagado)
const encerrar = async (id, { data_fim } = {}) => {
  const vinculo = await buscarPorId(id);
  if (!vinculo.ativo) {
    throw new ErroApi(400, 'Este vínculo já está encerrado.');
  }

  // Regra do condomínio: todo apartamento ativo deve ter um proprietário ativo
  // (apartamento inativo pode ficar sem proprietário; ao reativar, exige um)
  if (vinculo.tipo_vinculo === 'PROPRIETARIO') {
    const sql = `SELECT C.ativo,
                        (SELECT COUNT(*)
                           FROM T_VINCULO_APARTAMENTO A
                          WHERE A.id_apartamento = C.id_apartamento
                            AND A.id_vinculo    <> $2
                            AND A.tipo_vinculo   = 'PROPRIETARIO'
                            AND A.ativo          = TRUE) AS outros_proprietarios
                   FROM T_APARTAMENTO C
                  WHERE C.id_apartamento = $1`;
    const apto = (await db.query(sql, [vinculo.id_apartamento, id])).rows[0];

    if (apto.ativo && Number(apto.outros_proprietarios) === 0) {
      throw new ErroApi(409, 'Este é o único proprietário ativo do apartamento. Cadastre o novo proprietário antes de encerrar este vínculo.');
    }
  }

  const sql = `UPDATE T_VINCULO_APARTAMENTO
                  SET ativo    = FALSE,
                      data_fim = COALESCE($1, CURRENT_DATE)
                WHERE id_vinculo = $2
            RETURNING id_vinculo, id_pessoa, id_apartamento, tipo_vinculo, reside, data_inicio, data_fim, ativo`;
  const result = await db.query(sql, [data_fim, id]);
  return result.rows[0];
};

module.exports = {
  listar,
  buscarPorId,
  inserir,
  criar,
  alterar,
  encerrar
};
