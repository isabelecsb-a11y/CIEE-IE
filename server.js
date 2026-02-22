const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.static("public"));
app.use(express.json());

/* Criar tabela automaticamente */
pool.query(`
CREATE TABLE IF NOT EXISTS indicadores (
    id SERIAL PRIMARY KEY,
    total_tickets INT,
    resolvidos INT,
    pendentes INT,
    cancelados INT,
    satisfacao FLOAT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`);

app.post("/upload", upload.single("file"), async (req, res) => {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const row = data[0];

    await pool.query(`
        INSERT INTO indicadores 
        (total_tickets, resolvidos, pendentes, cancelados, satisfacao)
        VALUES ($1,$2,$3,$4,$5)
    `, [
        row.total,
        row.resolvidos,
        row.pendentes,
        row.cancelados,
        row.satisfacao
    ]);

    res.json({ ok: true });
});

app.get("/dados", async (req, res) => {
    const result = await pool.query(`
        SELECT * FROM indicadores 
        ORDER BY data DESC LIMIT 1
    `);

    res.json(result.rows[0]);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running"));
