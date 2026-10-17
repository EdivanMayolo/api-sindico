const { Pool, types } = require('pg');

// Colunas DATE (código 1082 no PostgreSQL) voltam como texto 'AAAA-MM-DD'.
// Sem isso, o pg cria um Date com hora e fuso ('2026-01-01T03:00:00.000Z'),
// e a data pode até aparecer como o dia anterior no frontend.
types.setTypeParser(1082, (valor) => valor);

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASS,
  port: process.env.POSTGRES_PORT,
});

// Transação: executa vários comandos como se fossem um só.
// Se algum falhar, desfaz tudo (ROLLBACK) e nada fica gravado pela metade.
// Uso no service:
//   await db.transacao(async (client) => {
//     await client.query('INSERT ...', [...]);
//     await client.query('INSERT ...', [...]);
//   });
const transacao = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await callback(client);
    await client.query('COMMIT');
    return resultado;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  query: (sql, params) => pool.query(sql, params),
  transacao
};
