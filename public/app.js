let grafico;
let abaAtual = "geral";

function trocarAba(aba) {
    abaAtual = aba;

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    event.target.classList.add("active");

    carregar();
}

async function carregar() {
    if (abaAtual === "geral") carregarGeral();
    if (abaAtual === "mensal") carregarMensal();
    if (abaAtual === "anual") carregarAnual();
    if (abaAtual === "ranking") carregarRanking();
}

/* =========================
   VISÃO GERAL
   ========================= */

async function carregarGeral() {
    const res = await fetch("/dados");
    const d = await res.json();

    if (!d) return estadoVazio();

    document.getElementById("conteudo").innerHTML = `
        <div class="cards">
            <div class="card"><span>Total</span><strong>${d.total || "-"}</strong></div>
            <div class="card"><span>Resolvidos</span><strong>${d.resolvidos || "-"}</strong></div>
            <div class="card"><span>Pendentes</span><strong>${d.pendentes || "-"}</strong></div>
            <div class="card"><span>Cancelados</span><strong>${d.cancelados || "-"}</strong></div>
            <div class="card"><span>Satisfação</span><strong>${d.satisfacao || "-"}</strong></div>
        </div>
    `;

    carregarGraficoLinha();
}

/* =========================
   MENSAL
   ========================= */

async function carregarMensal() {
    const res = await fetch("/mensal");
    const dados = await res.json();

    if (!dados.length) return estadoVazio();

    document.getElementById("conteudo").innerHTML = `<h3>Comparativo Mensal</h3>`;

    const labels = dados.map(d => "Mês " + d.mes);
    const resolvidos = dados.map(d => d.resolvidos);

    renderizarGrafico("bar", labels, resolvidos, "Resolvidos");
}

/* =========================
   ANUAL
   ========================= */

async function carregarAnual() {
    const res = await fetch("/anual");
    const dados = await res.json();

    if (!dados.length) return estadoVazio();

    document.getElementById("conteudo").innerHTML = `<h3>Visão Anual</h3>`;

    const labels = dados.map(d => d.ano);
    const totais = dados.map(d => d.total);

    renderizarGrafico("line", labels, totais, "Total Tickets");
}

/* =========================
   RANKING
   ========================= */

async function carregarRanking() {
    const res = await fetch("/ranking");
    const dados = await res.json();

    if (!dados.length) return estadoVazio();

    document.getElementById("conteudo").innerHTML = `
        <h3>Ranking Individual</h3>
        <div class="cards">
            ${dados.map(r => `
                <div class="card">
                    <span>${r.responsavel}</span>
                    <strong>${r.resolvidos}</strong>
                </div>
            `).join("")}
        </div>
    `;

    if (grafico) grafico.destroy();
}

/* ========================= */

async function carregarGraficoLinha() {
    const res = await fetch("/historico");
    const dados = await res.json();

    const labels = dados.map(d => new Date(d.data).toLocaleDateString());
    const totais = dados.map(d => d.total);

    renderizarGrafico("line", labels, totais, "Evolução");
}

function renderizarGrafico(tipo, labels, data, label) {
    if (grafico) grafico.destroy();

    grafico = new Chart(document.getElementById("grafico"), {
        type: tipo,
        data: {
            labels,
            datasets: [{
                label,
                data
            }]
        }
    });
}

function estadoVazio() {
    document.getElementById("conteudo").innerHTML = `
        <div class="empty-state">
            Sem dados disponíveis
        </div>
    `;
    if (grafico) grafico.destroy();
}

async function upload() {
    const file = document.getElementById("file").files[0];
    if (!file) return alert("Selecione um arquivo");

    const fd = new FormData();
    fd.append("file", file);

    await fetch("/upload", {
        method: "POST",
        body: fd
    });

    location.reload();
}

carregar();
