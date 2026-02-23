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
  tipo TEXT,
  total INT,
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

function procurar(sheet, texto) {
    const range = XLSX.utils.decode_range(sheet['!ref']);

    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {

            const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
            if (!cell) continue;

            if (String(cell.v).includes(texto)) {
                const valor = sheet[XLSX.utils.encode_cell({ r: R, c: C + 1 })];
                if (valor) return valor.v;
            }
        }
    }
    return null;
}

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    let tipo = "mensal";

    if (procurar(sheet, "Relatório Visual Anual")) tipo = "anual";
    if (procurar(sheet, "Pesquisa de Satisfação")) tipo = "satisfacao";
    if (procurar(sheet, "Individual")) tipo = "individual";

    const total = procurar(sheet, "Total") || procurar(sheet, "Total de Tickets");
    const resolvidos = procurar(sheet, "Resolvidos");
    const pendentes = procurar(sheet, "Pendentes");
    const cancelados = procurar(sheet, "Cancelados");
    const satisfacao = procurar(sheet, "Satisfação") || procurar(sheet, "Score");

    await pool.query(`
      INSERT INTO indicadores
      (tipo, total, resolvidos, pendentes, cancelados, satisfacao)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [tipo, total, resolvidos, pendentes, cancelados, satisfacao]);

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

app.get("/historico", async (req, res) => {
  const result = await pool.query(`
    SELECT data, total
    FROM indicadores
    ORDER BY data ASC
  `);

  res.json(result.rows);
});

/* PDF Executivo */

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
  doc.text(`Tipo: ${d.tipo}`);
  doc.text(`Total: ${d.total}`);
  doc.text(`Resolvidos: ${d.resolvidos}`);
  doc.text(`Pendentes: ${d.pendentes}`);
  doc.text(`Cancelados: ${d.cancelados}`);
  doc.text(`Satisfação: ${d.satisfacao}`);

  doc.end();
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("BI Inteligente Ativo 🚀🔥");
});
