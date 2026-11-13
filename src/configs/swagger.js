const fs = require('fs');
const path = require('path');
// autoHeaders: false → não cria o campo "authorization" em cada rota: o token
// é informado uma vez só, no botão Authorize (decisão 4A)
const swaggerAutogen = require('swagger-autogen')({ language: 'pt-BR', autoHeaders: false });
const swaggerUi = require('swagger-ui-express');

// Documentação gerada pelo swagger-autogen (padrão visto em aula).
// Ele lê o routers/index.js, segue cada router e monta o swagger_output.json.
// Os detalhes de cada rota ficam nos comentários #swagger dos routers;
// as tags (grupos) ficam no routers/index.js.
//
// Os caminhos passados ao swagger-autogen são RELATIVOS (com o caminho
// completo ele falha quando a pasta tem acento, ex.: "8ºSemestre"):
//   outputFile     → relativo ao arquivo iniciado (src/index.js), como em aula
//   endpointsFiles → relativo à pasta do projeto, por isso a API deve ser
//                    iniciada pela raiz (npm run dev / npm start)
const pastaDocs = path.join(__dirname, '../docs');
const outputFile = './docs/swagger_output.json';
const endpointsFiles = ['src/routers/index.js'];

const descricao = `
API REST do **CondoSimples** — Sistema de Autogestão Condominial (TCC II de Sistemas de Informação).

## Como fazer o login e testar as rotas

Quase todas as rotas exigem login (as que têm o **cadeado**). Para testar por esta página:

1. Abra **Auth → POST /auth/login** e clique em **Try it out**.
2. No corpo, informe o \`email\` e a \`senha\` de um usuário cadastrado e clique em **Execute**.
3. Na resposta, copie o valor do \`token\` (sem as aspas). Ele vale 8 horas.
4. Clique no botão verde **Authorize** (logo abaixo deste texto, à direita).
5. No campo **Value**, digite \`Bearer\`, um espaço e cole o token:
   \`Bearer eyJhbGciOiJIUzI1NiIs...\`
6. Clique em **Authorize** e depois em **Close**. O cadeado fica fechado.

Pronto: as rotas com cadeado passam a enviar o token. Quando o token vencer (401 "Sessão
expirada"), faça o login de novo e repita os passos 3 a 6 (**Logout** limpa o token antigo).

Atenção: o **Execute** grava de verdade no banco que a API está usando.

## Permissões

- **Logado:** qualquer usuário com token válido (perfil \`ADMIN\` ou \`COMUM\`).
- **ADMIN:** só usuário com perfil \`ADMIN\` (síndico). Usuário \`COMUM\` recebe **403**.

## Formato das respostas

Sucesso: \`{ "status": "ok", "data": ... }\` (ou \`"message"\` nas exclusões e trocas de senha).

Erro (modelo *Erro*, em **Models**): \`{ "status": "error", "message": "texto explicando o erro" }\`, com o código HTTP:

| Código | Quando |
|---|---|
| 400 | Dado inválido ou faltando, regra de negócio |
| 401 | Sem token, token inválido ou expirado |
| 403 | Sem permissão (rota só para ADMIN) |
| 404 | Registro ou rota não encontrada |
| 409 | Conflito: registro duplicado, em uso ou situação que impede a ação |
| 500 | Erro interno |

## Datas e valores

Datas no formato **AAAA-MM-DD** (ISO 8601). Valores em reais, como número (ex.: \`150.5\`).
`;

const doc = {
  info: {
    title: 'CondoSimples API',
    version: '1.0.0',
    description: descricao
  },
  host: `localhost:${process.env.PORT}`,
  basePath: '/',
  schemes: ['http'],
  consumes: ['application/json'],
  produces: ['application/json'],
  // Botão Authorize (decisão 4A). As rotas que exigem login recebem
  // #swagger.security = [{ "bearerAuth": [] }] (em routers/index.js e no authRouter).
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description: 'Digite Bearer, um espaço e o token do login. Ex.: Bearer eyJhbGciOiJIUzI1NiIs...'
    }
  },
  tags: [
    { name: 'Status', description: 'Teste da API e da conexão com o banco' },
    { name: 'Auth', description: 'Login e dados do usuário logado' },
    { name: 'Usuários', description: 'Usuários do sistema (só ADMIN)' },
    { name: 'Apartamentos', description: 'Unidades do condomínio. Não são excluídas, só inativadas (RN01)' },
    { name: 'Pessoas', description: 'Proprietários e inquilinos' },
    { name: 'Vínculos', description: 'Ligação pessoa ↔ apartamento (proprietário, inquilino, morador)' },
    { name: 'Despesas', description: 'Gastos do condomínio e prévia do rateio' },
    { name: 'Leituras de gás', description: 'Leitura do relógio de gás de cada apartamento' },
    { name: 'Faturas', description: 'Esboço da fatura mensal de cada apartamento' },
    { name: 'Receitas', description: 'Entradas de dinheiro' },
    { name: 'Financeiro', description: 'Movimentação e saldo do caixa' }
  ],
  // Exemplos reutilizados nos comentários dos routers ($ref: '#/definitions/Nome')
  definitions: {
    Erro: { status: 'error', message: 'Texto explicando o erro.' },

    Status: { versao: 'PostgreSQL 15.12, compiled by Visual C++ build 1942, 64-bit', banco: 'condosimples' },

    Login: { email: 'sindico@condominio.com', senha: 'sua_senha' },
    LoginResposta: {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      usuario: { id_usuario: 1, nome: 'Síndico', email: 'sindico@condominio.com', perfil: 'ADMIN' }
    },
    AlterarMinhaSenha: { senha_atual: 'senha_atual', nova_senha: 'nova_senha' },

    Usuario: { id_usuario: 1, nome: 'Síndico', email: 'sindico@condominio.com', perfil: 'ADMIN', ativo: true },
    UsuarioEntrada: { nome: 'Zelador', email: 'zelador@condominio.com', senha: '123456', perfil: 'COMUM' },
    UsuarioAlteracao: { nome: 'Zelador', email: 'zelador@condominio.com', perfil: 'COMUM', ativo: true },
    NovaSenha: { nova_senha: 'nova_senha' },

    Apartamento: {
      id_apartamento: 1, numero: '101', bloco: 'A', andar: '1', data_cadastro: '2026-06-01', ativo: true,
      proprietarios: 'João da Silva', moradores: 'Maria Souza'
    },
    ApartamentoDetalhe: {
      id_apartamento: 1, numero: '101', bloco: 'A', andar: '1', data_cadastro: '2026-06-01', ativo: true,
      vinculos: [{ $ref: '#/definitions/Vinculo' }]
    },
    ApartamentoDados: { id_apartamento: 3, numero: '103', bloco: 'A', andar: '1', data_cadastro: '2026-07-02', ativo: true },
    ApartamentoCriado: {
      id_apartamento: 3, numero: '103', bloco: 'A', andar: '1', data_cadastro: '2026-07-02', ativo: true,
      vinculos: [{ $ref: '#/definitions/VinculoDados' }]
    },
    ApartamentoEntrada: { numero: '103', bloco: 'A', andar: '1', id_pessoa_proprietario: 1, reside: false },
    ApartamentoAlteracao: { numero: '103', bloco: 'A', andar: '1' },

    Pessoa: {
      id_pessoa: 1, nome: 'João da Silva', cpf: '52998224725', telefone: '(51) 99999-0001',
      email: 'joao@email.com', endereco: 'Rua das Flores, 50', ativo: true
    },
    PessoaDetalhe: {
      id_pessoa: 1, nome: 'João da Silva', cpf: '52998224725', telefone: '(51) 99999-0001',
      email: 'joao@email.com', endereco: 'Rua das Flores, 50', ativo: true,
      vinculos: [{ $ref: '#/definitions/Vinculo' }]
    },
    PessoaEntrada: {
      nome: 'Ana Pereira', cpf: '111.444.777-35', telefone: '(51) 98888-0003',
      email: 'ana@email.com', endereco: 'Rua das Flores, 50'
    },
    PessoaAlteracao: {
      nome: 'Ana Pereira', cpf: '111.444.777-35', telefone: '(51) 98888-0003',
      email: 'ana@email.com', endereco: 'Rua das Flores, 50', ativo: true
    },

    Vinculo: {
      id_vinculo: 1, id_apartamento: 1, numero: '101', bloco: 'A', id_pessoa: 1, nome: 'João da Silva',
      tipo_vinculo: 'PROPRIETARIO', reside: false, data_inicio: '2026-01-01', data_fim: null, ativo: true
    },
    VinculoDados: {
      id_vinculo: 3, id_pessoa: 2, id_apartamento: 1, tipo_vinculo: 'INQUILINO', reside: true,
      data_inicio: '2026-03-01', data_fim: null, ativo: true
    },
    VinculoEntrada: { id_pessoa: 2, id_apartamento: 1, tipo_vinculo: 'INQUILINO', reside: true, data_inicio: '2026-03-01' },
    VinculoAlteracao: { reside: true, data_inicio: '2026-03-01' },
    VinculoEncerrar: { data_fim: '2026-10-31' },

    Despesa: {
      id_despesa: 1, descricao: 'Energia elétrica - áreas comuns', tipo_despesa: 'FIXA', valor_total: 300,
      valor_m3: null, data_referencia: '2026-06-30', observacao: null, ativo: true, mes_cobranca: 7, ano_cobranca: 2026,
      em_uso: false
    },
    DespesaEntrada: {
      descricao: 'Energia elétrica - áreas comuns', tipo_despesa: 'FIXA', valor_total: 300,
      valor_m3: null, data_referencia: '2026-06-30', observacao: null
    },
    Rateio: {
      id_despesa: 1, descricao: 'Energia elétrica - áreas comuns', valor_total: 300, mes_cobranca: 7, ano_cobranca: 2026,
      quantidade_apartamentos: 2,
      apartamentos: [
        { id_apartamento: 1, numero: '101', bloco: 'A', data_cadastro: '2026-06-01', valor: 150 },
        { id_apartamento: 2, numero: '102', bloco: 'A', data_cadastro: '2026-06-01', valor: 150 }
      ]
    },

    LeituraGas: {
      id_leitura_gas: 6, id_despesa: 4, id_apartamento: 2, numero: '102', bloco: 'A', data_leitura: '2026-08-31',
      leitura_anterior: 1012, leitura_atual: 1020, consumo: 8, valor_m3: 10, valor: 80, troca_relogio: false, finalizada: true
    },
    LeituraGasEntrada: { id_despesa: 4, id_apartamento: 2, leitura_atual: 1020, leitura_anterior: null, troca_relogio: false },
    LeituraGasAlteracao: { leitura_atual: 1020, leitura_anterior: null, troca_relogio: false },
    PainelGas: {
      id_despesa: 4, descricao: 'Gás', data_referencia: '2026-08-31', valor_m3: 10, inicio_leituras: '2026-08-31',
      total_apartamentos: 2, total_finalizadas: 1, completa: false,
      proximo_apartamento: { id_apartamento: 2, numero: '102', bloco: 'A' },
      valor_conta: 150, total_consumo: 50, diferenca: 100,
      apartamentos: [
        {
          id_apartamento: 1, numero: '101', bloco: 'A', data_cadastro: '2026-06-01', situacao: 'FINALIZADA',
          leitura: {
            id_leitura_gas: 5, id_despesa: 4, id_apartamento: 1, numero: '101', bloco: 'A', data_leitura: '2026-08-31',
            leitura_anterior: 1256.5, leitura_atual: 1261.5, consumo: 5, valor_m3: 10, valor: 50, troca_relogio: false, finalizada: true
          },
          ultima_leitura_finalizada: { id_apartamento: 1, leitura_atual: 1256.5, data_leitura: '2026-07-31' },
          leitura_anterior_bloqueada: true
        }
      ]
    },

    Fatura: {
      id_fatura: 1, id_apartamento: 1, numero: '101', bloco: 'A', mes_referencia: 6, ano_referencia: 2026,
      data_geracao: '2026-07-01', status: 'ABERTA', valor_total: 230, quantidade_itens: 2
    },
    FaturaDetalhe: {
      id_fatura: 1, id_apartamento: 1, numero: '101', bloco: 'A', mes_referencia: 6, ano_referencia: 2026,
      data_geracao: '2026-07-01', status: 'ABERTA', valor_total: 230,
      numero_documento: '000001', data_vencimento: '2026-07-15',
      cobranca: { multa_percentual: 2, multa_valor: 4.6, juros_mes_percentual: 1, juros_dia_valor: 0.08 },
      pagador: { nome: 'Maria Oliveira', cpf: '11144477735', endereco: null, tipo_vinculo: 'INQUILINO' },
      itens: [
        { id_item_fatura: 1, id_despesa: 1, descricao: 'Energia elétrica - áreas comuns', valor: 150, avulso: false },
        { id_item_fatura: 3, id_despesa: 2, descricao: 'Gás - consumo 8 m³', valor: 80, avulso: false }
      ]
    },
    GerarFaturas: { mes: 6, ano: 2026 },
    ItemAvulso: { descricao: 'Multa por barulho', valor: 50 },

    Receita: {
      id_receita: 1, descricao: 'Pagamento fatura 06/2026 - Apto 101', valor: 230,
      data_recebimento: '2026-07-05', observacao: null
    },
    ReceitaEntrada: {
      descricao: 'Pagamento fatura 06/2026 - Apto 101', valor: 230,
      data_recebimento: '2026-07-05', observacao: null
    },

    Movimentacao: { tipo: 'SAIDA', id_origem: 1, descricao: 'Energia elétrica - áreas comuns', valor: 300, data: '2026-06-30' },
    Saldo: { total_receitas: 230, total_despesas: 830, saldo: -600 },
    SaldoPeriodo: {
      data_inicio: '2026-07-01', data_fim: '2026-07-31', saldo_anterior: -480,
      entradas: 230, saidas: 200, saldo_periodo: 30, saldo_final: -450
    }
  }
};

// Gera o arquivo e só depois liga a rota /api-docs (decisão 2A).
// Esperar a geração evita carregar um arquivo antigo ou inexistente.
module.exports = async (app) => {
  fs.mkdirSync(pastaDocs, { recursive: true }); // o swagger-autogen não cria a pasta
  await swaggerAutogen(outputFile, endpointsFiles, doc);
  const swaggerFile = JSON.parse(fs.readFileSync(path.join(pastaDocs, 'swagger_output.json'), 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
};
