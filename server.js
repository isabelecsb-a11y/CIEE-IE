const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const { Pool } = require("pg");
const PDFDocument = require("pdfkit");

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
  total INT,
  resolvidos INT,
  pendentes INT,
  cancelados INT,
  satisfacao FLOAT,
  mes INT,
  ano INT,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`);

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const row = data[0];

    await pool.query(`
      INSERT INTO indicadores
      (total, resolvidos, pendentes, cancelados, satisfacao, mes, ano)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [
      row.total,
      row.resolvidos,
      row.pendentes,
      row.cancelados,
      row.satisfacao,
      row.mes,
      row.ano
    ]);

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao processar Excel" });
  }
});

app.get("/dados", async (req, res) => {
  const { mes, ano } = req.query;

  const result = await pool.query(`
    SELECT * FROM indicadores
    WHERE mes = $1 AND ano = $2
    ORDER BY data DESC
    LIMIT 1
  `, [mes, ano]);

  res.json(result.rows[0] || null);
});

app.get("/mensal", async (req, res) => {
  const result = await pool.query(`
    SELECT mes, SUM(resolvidos) resolvidos
    FROM indicadores
    GROUP BY mes
    ORDER BY mes
  `);

  res.json(result.rows);
});

app.get("/pdf", async (req, res) => {
  const result = await pool.query(`
    SELECT * FROM indicadores
    ORDER BY data DESC
    LIMIT 1
  `);

  const d = result.rows[0];

  if (!d) return res.status(400).send("Sem dados");

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  doc.fontSize(18).text("Relatório Executivo IE");
  doc.moveDown();
  doc.text(`Total: ${d.total}`);
  doc.text(`Resolvidos: ${d.resolvidos}`);
  doc.text(`Pendentes: ${d.pendentes}`);
  doc.text(`Cancelados: ${d.cancelados}`);
  doc.text(`Satisfação: ${d.satisfacao}`);
  doc.text(`Mês/Ano: ${d.mes}/${d.ano}`);

  doc.end();
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => console.log("BI Executivo rodando 🚀"));
