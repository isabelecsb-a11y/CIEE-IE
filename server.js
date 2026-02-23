const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const { Pool } = require("pg");
const PDFDocument = require("pdfkit");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static("public"));
app.use(express.json());

/* ================= BANCO BI DEFINITIVO ================= */

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS indicadores (
        id SERIAL PRIMARY KEY,

        mes INT,
        ano INT,

        total INT,
        resolvidos INT,
        pendentes INT,
        cancelados INT,

        satisfacao FLOAT,

        monique_total INT,
        monique_positiva INT,
        monique_negativa INT,

        lorenna_total INT,
        lorenna_positiva INT,
        lorenna_negativa INT,

        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Banco pronto");
  } catch (err) {
    console.error("❌ Erro DB:", err);
  }
}

initDB();

/* ================= UPLOAD INTELIGENTE ================= */

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const row = rows[0];
    const colunas = Object.keys(row);

    let dados = {
      mes: row["Mês"],
      ano: new Date().getFullYear()
    };

    /* 📊 RELATÓRIO OPERACIONAL */
    if (colunas.includes("Resolvido")) {

      dados.total =
        (row["Aberto"] || 0) +
        (row["Aguardando IE"] || 0) +
        (row["Cancelado"] || 0) +
        (row["Em espera"] || 0) +
        (row["Novo"] || 0) +
        (row["Pendente"] || 0) +
        (row["Resolvido"] || 0);

      dados.resolvidos = row["Resolvido"] || 0;
      dados.pendentes = row["Pendente"] || 0;
      dados.cancelados = row["Cancelado"] || 0;
    }

    /* 😊 SATISFAÇÃO GERAL */
    if (colunas.includes("Score Satisfação (%)")) {
      dados.satisfacao = row["Score Satisfação (%)"];
    }

    /* 👩‍💼 SATISFAÇÃO INDIVIDUAL */
    if (colunas.includes("Monique - Total")) {
      dados.monique_total = row["Monique - Total"];
      dados.monique_positiva = row["Monique - Positiva"];
      dados.monique_negativa = row["Monique - Negativa"];

      dados.lorenna_total = row["Lorenna - Total"];
      dados.lorenna_positiva = row["Lorenna - Positiva"];
      dados.lorenna_negativa = row["Lorenna - Negativa"];
    }

    await pool.query(`
      INSERT INTO indicadores (
        mes, ano,
        total, resolvidos, pendentes, cancelados,
        satisfacao,
        monique_total, monique_positiva, monique_negativa,
        lorenna_total, lorenna_positiva, lorenna_negativa
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    `, [
      dados.mes,
      dados.ano,

      dados.total || null,
      dados.resolvidos || null,
      dados.pendentes || null,
      dados.cancelados || null,

      dados.satisfacao || null,

      dados.monique_total || null,
      dados.monique_positiva || null,
      dados.monique_negativa || null,

      dados.lorenna_total || null,
      dados.lorenna_positiva || null,
      dados.lorenna_negativa || null
    ]);

    fs.unlinkSync(req.file.path);

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao processar Excel" });
  }
});

/* ================= DADOS CONSOLIDADOS ================= */

app.get("/dados", async (req, res) => {
  const { mes, ano } = req.query;

  const result = await pool.query(`
    SELECT
      MAX(total) total,
      MAX(resolvidos) resolvidos,
      MAX(pendentes) pendentes,
      MAX(cancelados) cancelados,
      MAX(satisfacao) satisfacao,

      MAX(monique_total) monique_total,
      MAX(monique_positiva) monique_positiva,
      MAX(monique_negativa) monique_negativa,

      MAX(lorenna_total) lorenna_total,
      MAX(lorenna_positiva) lorenna_positiva,
      MAX(lorenna_negativa) lorenna_negativa

    FROM indicadores
    WHERE mes = $1 AND ano = $2
  `, [mes, ano]);

  res.json(result.rows[0] || null);
});

/* ================= COMPARATIVO MENSAL ================= */

app.get("/mensal", async (req, res) => {
  const result = await pool.query(`
    SELECT mes, SUM(resolvidos) resolvidos
    FROM indicadores
    GROUP BY mes
    ORDER BY mes
  `);

  res.json(result.rows);
});

/* ================= PDF EXECUTIVO ================= */

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

  doc.end();
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => console.log("🚀 BI Executivo rodando"));
