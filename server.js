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

/* =========================
   CRIAR TABELA AUTOMÁTICA
   ========================= */

pool.query(`
CREATE TABLE IF NOT EXISTS indicadores (
  id SERIAL PRIMARY KEY,
  total_tickets INT,
  resolvidos INT,
  pendentes INT,
  cancelados INT,
  satisfacao FLOAT,
  responsavel TEXT,
  mes INT,
  ano INT,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`);

/* =========================
   UPLOAD EXCEL
   ========================= */

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data.length) {
      return res.status(400).json({ erro: "Excel vazio" });
    }

    const row = data[0];

    await pool.query(`
      INSERT INTO indicadores 
      (total_tickets, resolvidos, pendentes, cancelados, satisfacao, responsavel, mes, ano)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [
      row.total,
      row.resolvidos,
      row.pendentes,
      row.cancelados,
      row.satisfacao,
      row.responsavel,
      row.mes,
      row.ano
    ]);

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao processar Excel" });
  }
});

/* =========================
   ÚLTIMO RELATÓRIO (CARDS)
   ========================= */

app.get("/dados", async (req, res) => {
  const { mes, ano, responsavel } = req.query;

  let query = `
    SELECT * FROM indicadores
  `;
  const filtros = [];
  const valores = [];

  if (mes) {
    valores.push(mes);
    filtros.push(`mes = $${valores.length}`);
  }

  if (ano) {
    valores.push(ano);
    filtros.push(`ano = $${valores.length}`);
  }

  if (responsavel) {
    valores.push(responsavel);
    filtros.push(`responsavel = $${valores.length}`);
  }

  if (filtros.length) {
    query += ` WHERE ` + filtros.join(" AND ");
  }

  query += ` ORDER BY data DESC LIMIT 1`;

  const result = await pool.query(query, valores);

  res.json(result.rows[0] || null);
});

/* =========================
   COMPARATIVO MENSAL
   ========================= */

app.get("/mensal", async (req, res) => {
  const { ano } = req.query;

  let query = `
    SELECT mes,
           SUM(resolvidos) resolvidos,
           SUM(pendentes) pendentes,
           SUM(cancelados) cancelados
    FROM indicadores
  `;

  const valores = [];

  if (ano) {
    valores.push(ano);
    query += ` WHERE ano = $1`;
  }

  query += `
    GROUP BY mes
    ORDER BY mes
  `;

  const result = await pool.query(query, valores);

  res.json(result.rows);
});

/* =========================
   VISÃO ANUAL
   ========================= */

app.get("/anual", async (req, res) => {
  const result = await pool.query(`
    SELECT ano,
           SUM(total_tickets) total,
           SUM(resolvidos) resolvidos,
           AVG(satisfacao) satisfacao
    FROM indicadores
    GROUP BY ano
    ORDER BY ano
  `);

  res.json(result.rows);
});

/* =========================
   RANKING INDIVIDUAL
   ========================= */

app.get("/ranking", async (req, res) => {
  const { ano, mes } = req.query;

  let query = `
    SELECT responsavel,
           SUM(resolvidos) resolvidos,
           AVG(satisfacao) satisfacao
    FROM indicadores
  `;

  const filtros = [];
  const valores = [];

  if (ano) {
    valores.push(ano);
    filtros.push(`ano = $${valores.length}`);
  }

  if (mes) {
    valores.push(mes);
    filtros.push(`mes = $${valores.length}`);
  }

  if (filtros.length) {
    query += ` WHERE ` + filtros.join(" AND ");
  }

  query += `
    GROUP BY responsavel
    ORDER BY resolvidos DESC
  `;

  const result = await pool.query(query, valores);

  res.json(result.rows);
});

/* =========================
   EXPORTAÇÃO PDF EXECUTIVO
   ========================= */

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

  doc.fontSize(18).text("Relatório Executivo IE", { underline: true });

  doc.moveDown();
  doc.fontSize(12).text(`Total Tickets: ${d.total_tickets}`);
  doc.text(`Resolvidos: ${d.resolvidos}`);
  doc.text(`Pendentes: ${d.pendentes}`);
  doc.text(`Cancelados: ${d.cancelados}`);
  doc.text(`Satisfação: ${d.satisfacao}`);
  doc.text(`Responsável: ${d.responsavel}`);
  doc.text(`Mês/Ano: ${d.mes} / ${d.ano}`);

  doc.end();
});

/* ========================= */

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Server running 🚀");
});
