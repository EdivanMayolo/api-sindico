require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT;

// CORS liberado para o frontend (Quasar) consumir a API
app.use(cors());
app.use(express.json());

require('./routers')(app);

app.listen(PORT, () => {
  console.log(`API Rodando na porta ${PORT}`)
});
