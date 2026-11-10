/* =====================================================================
   SISTEMA DE AUTOGESTÃO CONDOMINIAL (CondoSimples)
   Criação do banco de dados — PostgreSQL 15 ou superior
   Baseado nos requisitos (RF / RNF / RN) do TCC II
   Acadêmico: Edivan Mayolo · Orientador: Gabriel Luiz Kunz

   Este arquivo NÃO é lido pela API: é a referência das tabelas do banco
   que a API usa (conexão em configs/index.js).

   Como executar no pgAdmin:
     1) Crie o banco:  CREATE DATABASE condosimples;
     2) Abra o Query Tool conectado ao banco "condosimples"
     3) Execute este script inteiro (F5), sem selecionar trechos
   Em um banco que já tem as tabelas, o script para no primeiro CREATE
   (nada é apagado).

   Padrão de nomes das restrições:
     pk_ = chave primária      fk_ = chave estrangeira
     uk_ = UNIQUE              ck_ = CHECK

   Regras de negócio (RN) e onde são garantidas:
     RN01 Apartamento não é excluído, só inativado ........ API + FKs
     RN02 Proprietário pode ter vários apartamentos ....... modelo (vínculo)
     RN03 Inquilino só em um apartamento por vez .......... índice único
     RN04 Todo vínculo identifica o tipo de relação ....... NOT NULL + CHECK
     RN05 Consumo de gás registrado por apartamento ....... T_LEITURA_GAS
     RN06 Valor do gás entra na fatura do apartamento ..... T_ITEM_FATURA
     RN07 Rateio igual entre apartamentos ativos .......... API
     RN08 Histórico não se perde com inativações .......... FKs (RESTRICT)
     Regra do condomínio: todo apartamento ativo deve ter
     um PROPRIETARIO ativo ................................ API
   ===================================================================== */


/* =====================================================================
   1. FUNÇÕES DE VALIDAÇÃO
   (criadas antes das tabelas, porque são usadas nos CHECKs)
   ===================================================================== */

/* ---------------------------------------------------------------------
   fn_valida_cpf — retorna TRUE se o CPF for válido (RNF07)
   Recebe só os 11 números, sem pontos e traço (ex.: '52998224725').
   Regras:
     1) precisa ter exatamente 11 dígitos numéricos
     2) não pode ter todos os dígitos iguais (ex.: 11111111111)
     3) os dois últimos dígitos (verificadores) precisam bater com o
        cálculo oficial:
          1º DV: soma dos 9 primeiros dígitos x pesos 10..2
          2º DV: soma dos 10 primeiros dígitos x pesos 11..2
          DV = (soma x 10) mod 11; se der 10, o DV é 0
   Uso: SELECT fn_valida_cpf('52998224725');   -- TRUE
   --------------------------------------------------------------------- */
CREATE FUNCTION fn_valida_cpf(p_cpf VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_soma INT;
    v_dv1  INT;
    v_dv2  INT;
    i      INT;
BEGIN
    -- 1) exatamente 11 dígitos numéricos
    IF p_cpf IS NULL OR p_cpf !~ '^[0-9]{11}$' THEN
        RETURN FALSE;
    END IF;

    -- 2) todos os dígitos iguais não é CPF válido
    IF p_cpf = REPEAT(SUBSTR(p_cpf, 1, 1), 11) THEN
        RETURN FALSE;
    END IF;

    -- 3) primeiro dígito verificador
    v_soma := 0;
    FOR i IN 1..9 LOOP
        v_soma := v_soma + CAST(SUBSTR(p_cpf, i, 1) AS INT) * (11 - i);
    END LOOP;
    v_dv1 := (v_soma * 10) % 11;
    IF v_dv1 = 10 THEN
        v_dv1 := 0;
    END IF;

    --    segundo dígito verificador
    v_soma := 0;
    FOR i IN 1..10 LOOP
        v_soma := v_soma + CAST(SUBSTR(p_cpf, i, 1) AS INT) * (12 - i);
    END LOOP;
    v_dv2 := (v_soma * 10) % 11;
    IF v_dv2 = 10 THEN
        v_dv2 := 0;
    END IF;

    RETURN v_dv1 = CAST(SUBSTR(p_cpf, 10, 1) AS INT)
       AND v_dv2 = CAST(SUBSTR(p_cpf, 11, 1) AS INT);
END;
$$ LANGUAGE plpgsql IMMUTABLE;


/* =====================================================================
   2. TABELAS
   (criadas na ordem certa: primeiro as que não dependem de ninguém)
   ===================================================================== */

/* ---------------------------------------------------------------------
   T_PESSOA — proprietários e inquilinos (RF3)
   Se é proprietária ou inquilina fica em T_VINCULO_APARTAMENTO (RF4).
   Só pode ser excluída se não tiver vínculos; senão, é inativada (RN08).
   cpf: só os 11 números, validado pela fn_valida_cpf (RNF07).
   telefone: obrigatório (contato do síndico com o morador).
   --------------------------------------------------------------------- */
CREATE TABLE T_PESSOA (
    id_pessoa   SERIAL        NOT NULL,
    nome        VARCHAR(100)  NOT NULL,
    cpf         CHAR(11)      NOT NULL,
    telefone    VARCHAR(20)   NOT NULL,
    email       VARCHAR(100),
    endereco    VARCHAR(200),
    ativo       BOOLEAN       NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_pessoa     PRIMARY KEY (id_pessoa),
    CONSTRAINT uk_pessoa_cpf UNIQUE (cpf),
    CONSTRAINT ck_pessoa_cpf CHECK (fn_valida_cpf(cpf))
);


/* ---------------------------------------------------------------------
   T_APARTAMENTO — unidades do prédio (RF2)
   Nunca é excluído, apenas inativado (RN01).
   NULLS NOT DISTINCT: sem bloco, também não pode haver dois "101".
   data_cadastro: preenchida automaticamente. Usada pela API para:
     - o prazo de cadastro: todos os aptos em até 5 dias a partir do 1º;
     - a leitura de gás: o apto só entra na fila de um mês se foi
       cadastrado até o dia em que as leituras daquele mês começaram.
   --------------------------------------------------------------------- */
CREATE TABLE T_APARTAMENTO (
    id_apartamento  SERIAL       NOT NULL,
    numero          VARCHAR(10)  NOT NULL,
    bloco           VARCHAR(10),
    andar           VARCHAR(5),
    data_cadastro   DATE         NOT NULL DEFAULT CURRENT_DATE,
    ativo           BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_apartamento PRIMARY KEY (id_apartamento),
    CONSTRAINT uk_apartamento_numero_bloco UNIQUE NULLS NOT DISTINCT (numero, bloco)
);


/* ---------------------------------------------------------------------
   T_VINCULO_APARTAMENTO — "esta pessoa tem esta relação com este
   apartamento neste período" (RF5). Resolve o N:N entre T_PESSOA e
   T_APARTAMENTO e permite um proprietário em vários aptos (RF6 / RN02).
   reside = TRUE indica o morador (RF4).
   --------------------------------------------------------------------- */
CREATE TABLE T_VINCULO_APARTAMENTO (
    id_vinculo      SERIAL       NOT NULL,
    id_pessoa       INT          NOT NULL,
    id_apartamento  INT          NOT NULL,
    tipo_vinculo    VARCHAR(12)  NOT NULL,
    reside          BOOLEAN      NOT NULL DEFAULT FALSE,
    data_inicio     DATE         NOT NULL DEFAULT CURRENT_DATE,
    data_fim        DATE,
    ativo           BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_vinculo_apartamento PRIMARY KEY (id_vinculo),
    CONSTRAINT fk_vinculo_pessoa
        FOREIGN KEY (id_pessoa)      REFERENCES T_PESSOA (id_pessoa),
    CONSTRAINT fk_vinculo_apartamento
        FOREIGN KEY (id_apartamento) REFERENCES T_APARTAMENTO (id_apartamento),
    -- RN04: todo vínculo identifica o tipo de relação
    CONSTRAINT ck_vinculo_tipo
        CHECK (tipo_vinculo IN ('PROPRIETARIO', 'INQUILINO')),
    CONSTRAINT ck_vinculo_datas
        CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- RN03 / RF7: um inquilino só pode ter UM vínculo ativo por vez
CREATE UNIQUE INDEX uk_vinculo_inquilino_ativo
    ON T_VINCULO_APARTAMENTO (id_pessoa)
    WHERE tipo_vinculo = 'INQUILINO' AND ativo = TRUE;


/* ---------------------------------------------------------------------
   T_DESPESA — gastos do condomínio, fixos e variáveis (RF8 / RF9)
   valor_m3: preenchido só na despesa de gás (VARIAVEL). É o preço do
   m³ usado no cálculo das leituras (RF14).
     - Despesa SEM valor_m3 → rateio igual entre os aptos ativos (RN07)
     - Despesa COM valor_m3 → cada apto paga o seu consumo (RN05/RN06)
   --------------------------------------------------------------------- */
CREATE TABLE T_DESPESA (
    id_despesa       SERIAL         NOT NULL,
    descricao        VARCHAR(150)   NOT NULL,
    tipo_despesa     VARCHAR(10)    NOT NULL,
    valor_total      DECIMAL(10,2)  NOT NULL,
    valor_m3         DECIMAL(10,2),
    data_referencia  DATE           NOT NULL,
    observacao       VARCHAR(255),
    ativo            BOOLEAN        NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_despesa PRIMARY KEY (id_despesa),
    CONSTRAINT ck_despesa_tipo
        CHECK (tipo_despesa IN ('FIXA', 'VARIAVEL', 'OUTROS')),
    CONSTRAINT ck_despesa_valor CHECK (valor_total > 0),
    -- só despesa VARIAVEL pode ter preço do m³
    CONSTRAINT ck_despesa_valor_m3
        CHECK (valor_m3 IS NULL OR (valor_m3 > 0 AND tipo_despesa = 'VARIAVEL'))
);


/* ---------------------------------------------------------------------
   T_LEITURA_GAS — leitura do relógio de gás de cada apartamento
   (RF13 / RF14 / RN05). Fica ligada à despesa de gás do mês.
     leitura_anterior = digitada só na 1ª leitura do apartamento; nas
                        próximas, a trigger copia a leitura_atual da
                        última leitura finalizada (evita erro de digitação)
     troca_relogio    = TRUE quando a companhia trocou o relógio: libera a
                        digitação da leitura_anterior (leitura inicial do
                        relógio novo). Só ADMIN pode marcar (validado na API).
     consumo = leitura_atual - leitura_anterior   (calculado pela trigger)
     valor   = consumo x valor_m3 da despesa       (calculado ao finalizar)
   Enquanto finalizada = FALSE, a leitura pode ser corrigida.
   Depois de finalizada, não pode mais ser alterada nem excluída.
   --------------------------------------------------------------------- */
CREATE TABLE T_LEITURA_GAS (
    id_leitura_gas    SERIAL         NOT NULL,
    id_despesa        INT            NOT NULL,
    id_apartamento    INT            NOT NULL,
    data_leitura      DATE           NOT NULL DEFAULT CURRENT_DATE,
    leitura_anterior  DECIMAL(10,3)  NOT NULL,
    leitura_atual     DECIMAL(10,3)  NOT NULL,
    consumo           DECIMAL(10,3)  NOT NULL DEFAULT 0,
    valor_m3          DECIMAL(10,2),
    valor             DECIMAL(10,2),
    troca_relogio     BOOLEAN        NOT NULL DEFAULT FALSE,
    finalizada        BOOLEAN        NOT NULL DEFAULT FALSE,

    CONSTRAINT pk_leitura_gas PRIMARY KEY (id_leitura_gas),
    CONSTRAINT fk_leitura_gas_despesa
        FOREIGN KEY (id_despesa)     REFERENCES T_DESPESA (id_despesa),
    CONSTRAINT fk_leitura_gas_apartamento
        FOREIGN KEY (id_apartamento) REFERENCES T_APARTAMENTO (id_apartamento),
    -- uma leitura por apartamento em cada despesa de gás
    CONSTRAINT uk_leitura_gas_despesa_apto UNIQUE (id_despesa, id_apartamento),
    CONSTRAINT ck_leitura_gas_valores
        CHECK (leitura_anterior >= 0 AND leitura_atual >= leitura_anterior),
    -- leitura finalizada precisa ter o valor calculado
    CONSTRAINT ck_leitura_gas_finalizada
        CHECK (finalizada = FALSE OR (valor_m3 IS NOT NULL AND valor IS NOT NULL))
);


/* ---------------------------------------------------------------------
   T_FATURA — "esboço" de fatura mensal de um apartamento (RF16 / RF17)
   Não é boleto bancário. PAGA é marcado manualmente pelo síndico.
   --------------------------------------------------------------------- */
CREATE TABLE T_FATURA (
    id_fatura       SERIAL         NOT NULL,
    id_apartamento  INT            NOT NULL,
    mes_referencia  SMALLINT       NOT NULL,
    ano_referencia  SMALLINT       NOT NULL,
    data_geracao    DATE           NOT NULL DEFAULT CURRENT_DATE,
    status          VARCHAR(10)    NOT NULL DEFAULT 'ABERTA',
    valor_total     DECIMAL(10,2)  NOT NULL DEFAULT 0,

    CONSTRAINT pk_fatura PRIMARY KEY (id_fatura),
    CONSTRAINT fk_fatura_apartamento
        FOREIGN KEY (id_apartamento) REFERENCES T_APARTAMENTO (id_apartamento),
    CONSTRAINT ck_fatura_mes    CHECK (mes_referencia BETWEEN 1 AND 12),
    CONSTRAINT ck_fatura_status
        CHECK (status IN ('ABERTA', 'EMITIDA', 'PAGA', 'CANCELADA')),
    CONSTRAINT ck_fatura_valor  CHECK (valor_total >= 0)
);

-- Uma fatura válida por apartamento/mês/ano (as CANCELADAS não contam)
CREATE UNIQUE INDEX uk_fatura_apto_mes_ano
    ON T_FATURA (id_apartamento, mes_referencia, ano_referencia)
    WHERE status <> 'CANCELADA';


/* ---------------------------------------------------------------------
   T_ITEM_FATURA — linhas da fatura (RF15 / RF16 / RN06)
   Cada item é a parte de uma despesa que cabe ao apartamento:
     - despesa comum → valor_total / nº de aptos ativos (RN07)
     - despesa de gás → valor da leitura finalizada do apto
   id_despesa é opcional: um item avulso (ex.: multa) não tem despesa.
   Composição: o item não existe sem a fatura (ON DELETE CASCADE).
   --------------------------------------------------------------------- */
CREATE TABLE T_ITEM_FATURA (
    id_item_fatura  SERIAL         NOT NULL,
    id_fatura       INT            NOT NULL,
    id_despesa      INT,
    descricao       VARCHAR(150)   NOT NULL,
    valor           DECIMAL(10,2)  NOT NULL,

    CONSTRAINT pk_item_fatura PRIMARY KEY (id_item_fatura),
    CONSTRAINT fk_item_fatura_fatura
        FOREIGN KEY (id_fatura)  REFERENCES T_FATURA (id_fatura) ON DELETE CASCADE,
    CONSTRAINT fk_item_fatura_despesa
        FOREIGN KEY (id_despesa) REFERENCES T_DESPESA (id_despesa),
    -- a mesma despesa não pode ser cobrada duas vezes na mesma fatura
    CONSTRAINT uk_item_fatura_fatura_despesa UNIQUE (id_fatura, id_despesa),
    CONSTRAINT ck_item_fatura_valor CHECK (valor >= 0)
);


/* ---------------------------------------------------------------------
   T_USUARIO — quem faz login no sistema (RF1 / RNF05)
   A senha nunca é gravada em texto puro, só o hash (RNF06).
   --------------------------------------------------------------------- */
CREATE TABLE T_USUARIO (
    id_usuario  SERIAL        NOT NULL,
    nome        VARCHAR(100)  NOT NULL,
    email       VARCHAR(100)  NOT NULL,
    senha_hash  VARCHAR(255)  NOT NULL,
    perfil      VARCHAR(10)   NOT NULL DEFAULT 'COMUM',
    ativo       BOOLEAN       NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_usuario        PRIMARY KEY (id_usuario),
    CONSTRAINT uk_usuario_email  UNIQUE (email),
    CONSTRAINT ck_usuario_perfil CHECK (perfil IN ('ADMIN', 'COMUM'))
);


/* ---------------------------------------------------------------------
   T_RECEITA — dinheiro que entra no caixa do condomínio (RF10)
   --------------------------------------------------------------------- */
CREATE TABLE T_RECEITA (
    id_receita        SERIAL         NOT NULL,
    descricao         VARCHAR(150)   NOT NULL,
    valor             DECIMAL(10,2)  NOT NULL,
    data_recebimento  DATE           NOT NULL,
    observacao        VARCHAR(255),

    CONSTRAINT pk_receita PRIMARY KEY (id_receita),
    CONSTRAINT ck_receita_valor CHECK (valor > 0)
);


/* =====================================================================
   3. TRIGGERS
   ===================================================================== */

/* ---------------------------------------------------------------------
   3.1 Total da fatura
   "O valor_total da T_FATURA é a soma dos itens dela."
   Sempre que um item é incluído, alterado ou excluído, o total da
   fatura é recalculado automaticamente.
   --------------------------------------------------------------------- */
CREATE FUNCTION fn_atualiza_total_fatura()
RETURNS TRIGGER AS $$
DECLARE
    v_id_fatura INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_id_fatura := OLD.id_fatura;
    ELSE
        v_id_fatura := NEW.id_fatura;
    END IF;

    UPDATE T_FATURA
       SET valor_total = (SELECT COALESCE(SUM(valor), 0)
                            FROM T_ITEM_FATURA
                           WHERE id_fatura = v_id_fatura)
     WHERE id_fatura = v_id_fatura;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualiza_total_fatura
AFTER INSERT OR UPDATE OR DELETE ON T_ITEM_FATURA
FOR EACH ROW
EXECUTE FUNCTION fn_atualiza_total_fatura();


/* ---------------------------------------------------------------------
   3.2 Leitura de gás (RF13 / RF14)
   - Só aceita leitura em despesa que tenha valor do m³ (despesa de gás)
   - Leitura anterior:
       * troca de relógio → usa o valor digitado (leitura inicial do
         relógio novo), que é obrigatório
       * apartamento com leitura finalizada → usa a leitura_atual dela
         (ignora o que foi digitado)
       * primeira leitura do apartamento → precisa ser informada
   - Sempre calcula o consumo: leitura_atual - leitura_anterior
   - Ao finalizar (finalizada = TRUE): busca o valor do m³ na despesa
     e calcula o valor = consumo x valor_m3
   - Leitura finalizada não pode ser alterada nem excluída (RN08)
   --------------------------------------------------------------------- */
CREATE FUNCTION fn_leitura_gas()
RETURNS TRIGGER AS $$
DECLARE
    v_valor_m3 DECIMAL(10,2);
    v_anterior DECIMAL(10,3);
BEGIN
    -- leitura já finalizada fica travada
    IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.finalizada THEN
        RAISE EXCEPTION 'Leitura de gás já finalizada não pode ser alterada ou excluída.';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    -- a leitura só pode ser lançada numa despesa de gás (com valor do m³)
    SELECT valor_m3 INTO v_valor_m3
      FROM T_DESPESA
     WHERE id_despesa = NEW.id_despesa;

    IF v_valor_m3 IS NULL THEN
        RAISE EXCEPTION 'Leitura de gás só pode ser lançada em uma despesa com o valor do m³ informado.';
    END IF;

    IF NEW.troca_relogio THEN
        -- relógio novo: a leitura inicial dele precisa ser digitada
        IF NEW.leitura_anterior IS NULL THEN
            RAISE EXCEPTION 'Troca de relógio: informe a leitura inicial do relógio novo.';
        END IF;
    ELSE
        -- leitura anterior: última leitura finalizada do mesmo apartamento
        SELECT A.leitura_atual INTO v_anterior
          FROM T_LEITURA_GAS A
         WHERE A.id_apartamento  = NEW.id_apartamento
           AND A.finalizada      = TRUE
           AND A.id_leitura_gas <> NEW.id_leitura_gas
         ORDER BY A.data_leitura DESC, A.id_leitura_gas DESC
         LIMIT 1;

        IF FOUND THEN
            NEW.leitura_anterior := v_anterior;
        ELSIF NEW.leitura_anterior IS NULL THEN
            RAISE EXCEPTION 'Primeira leitura do apartamento: informe a leitura anterior do relógio.';
        END IF;
    END IF;

    NEW.consumo := NEW.leitura_atual - NEW.leitura_anterior;

    IF NEW.finalizada THEN
        NEW.valor_m3 := v_valor_m3;
        NEW.valor    := ROUND(NEW.consumo * v_valor_m3, 2);
    ELSE
        NEW.valor_m3 := NULL;
        NEW.valor    := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leitura_gas
BEFORE INSERT OR UPDATE OR DELETE ON T_LEITURA_GAS
FOR EACH ROW
EXECUTE FUNCTION fn_leitura_gas();


/* =====================================================================
   4. VIEWS
   Movimentação financeira e saldo NÃO são tabelas: são consultas
   sobre T_RECEITA (entradas) e T_DESPESA (saídas), para não gravar o
   mesmo valor duas vezes (RF11 / RF12 / RF18).
   ===================================================================== */

-- Extrato: todas as entradas e saídas em ordem de data
CREATE VIEW vw_movimentacao_financeira AS
    SELECT 'ENTRADA'          AS tipo,
           r.id_receita       AS id_origem,
           r.descricao,
           r.valor,
           r.data_recebimento AS data
      FROM T_RECEITA r
    UNION ALL
    SELECT 'SAIDA',
           d.id_despesa,
           d.descricao,
           d.valor_total,
           d.data_referencia
      FROM T_DESPESA d
     WHERE d.ativo = TRUE;

-- Saldo do caixa: soma das receitas menos soma das despesas
CREATE VIEW vw_saldo AS
    SELECT COALESCE(SUM(CASE WHEN tipo = 'ENTRADA' THEN valor END), 0) AS total_receitas,
           COALESCE(SUM(CASE WHEN tipo = 'SAIDA'   THEN valor END), 0) AS total_despesas,
           COALESCE(SUM(CASE WHEN tipo = 'ENTRADA' THEN valor ELSE -valor END), 0) AS saldo
      FROM vw_movimentacao_financeira;
