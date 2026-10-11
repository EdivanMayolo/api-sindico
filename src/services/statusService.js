const db = require('../configs');

// Service: é a camada que conversa com o banco (SQL escrito à mão).
const verificarConexao = async () => {
  const sql = 'SELECT version() AS versao, current_database() AS banco';
  const result = await db.query(sql);
  return result.rows[0];
};

module.exports = {
  verificarConexao
};
