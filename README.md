# CondoSimples API

API REST do **CondoSimples** — Sistema de Autogestão Condominial.

TCC II de Sistemas de Informação — Acadêmico: Edivan Mayolo · Orientador: Gabriel Luiz Kunz

Feita com Node.js, Express e PostgreSQL (`pg`, SQL escrito à mão), a partir do `api-template` usado nas aulas.

## Instruções

1. Crie o banco `condosimples` no PostgreSQL (versão 15 ou superior) e, conectado a ele, execute os scripts da pasta `src/configs`, nesta ordem:
   - `banco.sql` — tabelas, função de validação do CPF, triggers e views;
   - `usuario_inicial.sql` — primeiro usuário ADMIN (`admin@condosimples.com`). A senha não fica no repositório: peça ao autor do projeto e troque no primeiro acesso (menu do usuário → Alterar senha).

2. Crie o arquivo `.env` na raiz do projeto:

```
PORT=3000
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_DB=condosimples
POSTGRES_PASS=
POSTGRES_PORT=5432

JWT_SECRET=
JWT_EXPIRES_IN=8h
```

   Opcional — dados de cobrança do esboço da fatura (sem estas linhas valem os padrões: vencimento no dia 15, multa de 2% e juros de 1% ao mês):

```
FATURA_VENCIMENTO_DIA=15
FATURA_MULTA_PERCENTUAL=2
FATURA_JUROS_MES_PERCENTUAL=1
```

3. Na pasta do projeto, execute:

```bash
npm install
npm run dev
```

## Documentação

Com a API rodando, a documentação das rotas (Swagger) fica em:

```
http://localhost:3000/api-docs
```

Na própria página está explicado como fazer o login e testar as rotas.

## Estrutura

```
src/
  configs/      conexão com o banco e configuração do Swagger
  routers/      rotas (URL + permissão)
  controllers/  recebem a requisição e devolvem a resposta
  services/     regras de negócio e SQL
  middlewares/  login (token) e tratamento de erros
  utils/        funções de apoio
  docs/         documentação gerada pelo Swagger
```
