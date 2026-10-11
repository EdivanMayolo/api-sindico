const db = require('../configs');

const verificarConexao = async () => {
  const sql = 'SELECT version() AS versao, current_database() AS banco';
  const result = await db.query(sql);
  return result.rows[0];
};

module.exports = {
  verificarConexao
};
