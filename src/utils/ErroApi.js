// Erro de regra de negócio, com o status HTTP que deve ser devolvido.
// Uso no service: throw new ErroApi(404, 'Apartamento não encontrado.');
class ErroApi extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = ErroApi;
