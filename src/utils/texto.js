// Texto vazio ou só com espaços vira NULL; senão, devolve o texto sem espaços nas pontas.
// Ex.: bloco '' e bloco NULL precisam ser a mesma coisa para o UNIQUE do apartamento.
const textoOuNulo = (valor) => {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return null;
  }
  return String(valor).trim();
};

// Mantém só os números. Ex.: CPF '529.982.247-25' → '52998224725'
const somenteNumeros = (valor) => String(valor ?? '').replace(/\D/g, '');

module.exports = {
  textoOuNulo,
  somenteNumeros
};
