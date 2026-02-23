const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const { Pool } = require("pg");

const app = express();
const upload = multer({ dest: "uploads/" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static("public"));
app.use(express.json());

pool.query(`
CREATE TABLE IF NOT EXISTS indicadores (
  id SERIAL PRIMARY KEY,
  tipo TEXT,
  total INT,
  resolvidos INT,
  pendentes INT,
  cancelados INT,
  satisfacao FLOAT,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`);

function procurarValor(sheet, textoBusca) {
    const range = XLSX.utils.decode_range(sheet['!ref']);

    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {

            const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
            if (!cell) continue;

            if (String(cell.v).includes(textoBusca)) {
                const valorCell = sheet[XLSX.utils.encode_cell({ r: R, c: C + 1 })];
                if (valorCell) return valorCell.v;
            }
        }
    }
    return null;
}

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    /* Detectar tipo de relatório */

    let tipo = "desconhecido";

    if (procurarValor(sheet, "Total de Tickets")) tipo = "anual";
    if (procurarValor(sheet, "Total Tickets Pesquisa")) tipo = "satisfacao";

    let total = procurarValor(sheet, "Total de Tickets") ||
                procurarValor(sheet, "Total Tickets Pesquisa");

    let resolvidos = procurarValor(sheet, "Total Resolvidos") ||
                     procurarValor(sheet, "Satisfação Positiva");

    let cancelados = procurarValor(sheet, "Cancelados") ||
                     procurarValor(sheet, "Satisfação Negativa");

    let satisfacao = procurarValor(sheet, "Score Satisfação");

    await pool.query(`
      INSERT INTO indicadores (tipo, total, resolvidos, cancelados, satisfacao)
      VALUES ($1,$2,$3,$4,$5)
    `, [tipo, total, resolvidos, cancelados, satisfacao]);

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao processar relatório" });
  }
});

app.get("/dados", async (req, res) => {
  const result = await pool.query(`
    SELECT * FROM indicadores
    ORDER BY data DESC
    LIMIT 1
  `);

  res.json(result.rows[0] || null);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Parser inteligente ativo 🚀"));
