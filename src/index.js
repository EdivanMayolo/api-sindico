require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rotaNaoEncontrada = require('./middlewares/rotaNaoEncontrada');
const tratarErros = require('./middlewares/tratarErros');
const app = express();
const PORT = process.env.PORT;

// CORS liberado para o frontend (Quasar) consumir a API
app.use(cors());
app.use(express.json());

require('./routers')(app);

// Estes dois ficam sempre por último
app.use(rotaNaoEncontrada);
app.use(tratarErros);

app.listen(PORT, () => {
  console.log(`API Rodando na porta ${PORT}`)
});
