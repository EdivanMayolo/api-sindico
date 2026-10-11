const { Pool } = require('pg');

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
