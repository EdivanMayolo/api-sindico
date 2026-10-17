// Tradução das restrições do banco (uk_, ck_, fk_) para mensagens
// compreensíveis ao usuário (RNF14). Os nomes são os mesmos do
// database/01_criacao_banco.sql: ao criar uma restrição nova, incluir aqui.
module.exports = {
  // UNIQUE
  uk_pessoa_cpf: 'Já existe uma pessoa cadastrada com este CPF.',
  uk_apartamento_numero_bloco: 'Já existe um apartamento com este número neste bloco.',
  uk_vinculo_inquilino_ativo: 'Este inquilino já possui vínculo ativo com um apartamento.',
  uk_leitura_gas_despesa_apto: 'Este apartamento já possui leitura de gás nesta despesa.',
  uk_fatura_apto_mes_ano: 'Este apartamento já possui fatura neste mês/ano.',
  uk_item_fatura_fatura_despesa: 'Esta despesa já foi lançada nesta fatura.',
  uk_usuario_email: 'Já existe um usuário cadastrado com este e-mail.',

  // CHECK
  ck_pessoa_cpf: 'CPF inválido.',
  ck_vinculo_tipo: 'Tipo de vínculo inválido. Use PROPRIETARIO ou INQUILINO.',
  ck_vinculo_datas: 'A data de fim não pode ser anterior à data de início.',
  ck_despesa_tipo: 'Tipo de despesa inválido. Use FIXA, VARIAVEL ou OUTROS.',
  ck_despesa_valor: 'O valor da despesa deve ser maior que zero.',
  ck_despesa_valor_m3: 'O valor do m³ deve ser maior que zero e só pode ser informado em despesa VARIAVEL.',
  ck_leitura_gas_valores: 'A leitura atual não pode ser menor que a leitura anterior.',
  ck_leitura_gas_finalizada: 'Leitura finalizada precisa ter o valor calculado.',
  ck_fatura_mes: 'O mês de referência deve estar entre 1 e 12.',
  ck_fatura_status: 'Status inválido. Use ABERTA, EMITIDA, PAGA ou CANCELADA.',
  ck_fatura_valor: 'O valor da fatura não pode ser negativo.',
  ck_item_fatura_valor: 'O valor do item não pode ser negativo.',
  ck_usuario_perfil: 'Perfil inválido. Use ADMIN ou COMUM.',
  ck_receita_valor: 'O valor da receita deve ser maior que zero.',

  // FOREIGN KEY (registro inexistente ao gravar, ou em uso ao excluir)
  fk_vinculo_pessoa: 'Pessoa não encontrada, ou possui vínculos e não pode ser excluída.',
  fk_vinculo_apartamento: 'Apartamento não encontrado, ou possui vínculos.',
  fk_leitura_gas_despesa: 'Despesa não encontrada, ou possui leituras de gás.',
  fk_leitura_gas_apartamento: 'Apartamento não encontrado, ou possui leituras de gás.',
  fk_fatura_apartamento: 'Apartamento não encontrado, ou possui faturas.',
  fk_item_fatura_fatura: 'Fatura não encontrada.',
  fk_item_fatura_despesa: 'Despesa não encontrada, ou já lançada em faturas.'
};
