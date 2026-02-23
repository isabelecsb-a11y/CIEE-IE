let grafico;

popularFiltros();
carregar();

function toggleTheme() {
    document.body.classList.toggle("dark");
}

/* =========================
   FILTROS
   ========================= */

function popularFiltros() {
    const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

    document.getElementById("mes").innerHTML =
        meses.map((m,i)=>`<option value="${i+1}">${m}</option>`).join("");

    const anos = [2024,2025,2026,2027];

    document.getElementById("ano").innerHTML =
        anos.map(a=>`<option value="${a}">${a}</option>`).join("");
}

function aplicarFiltro() {
    carregar();
}

/* =========================
   KPIs
   ========================= */

async function carregar() {
    const mes = document.getElementById("mes").value;
    const ano = document.getElementById("ano").value;

    const res = await fetch(`/dados?mes=${mes}&ano=${ano}`);
    const d = await res.json();

    if (!d) {
        document.getElementById("conteudo").innerHTML = "Sem dados";
        if (grafico) grafico.destroy();
        return;
    }

    const anterior = await fetch(`/dados?mes=${mes-1}&ano=${ano}`);
    const prev = await anterior.json();

    const delta = prev ? calcularDelta(d.total, prev.total) : null;

    document.getElementById("conteudo").innerHTML = `
        <div class="cards">
            <div class="card">
                Total Tickets
                <strong>${d.total}</strong>
                ${deltaHTML(delta)}
            </div>
            <div class="card">
                Resolvidos
                <strong>${d.resolvidos}</strong>
            </div>
            <div class="card">
                Satisfação
                <strong>${d.satisfacao}</strong>
            </div>
        </div>
    `;

    carregarGrafico();
}

function calcularDelta(atual, anterior) {
    const diff = ((atual - anterior) / anterior * 100).toFixed(1);
    return diff;
}

function deltaHTML(delta) {
    if (!delta) return "";

    return `
        <div class="delta ${delta >= 0 ? "up" : "down"}">
            ${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta)}%
        </div>
    `;
}

/* ========================= */

async function carregarGrafico() {
    const res = await fetch("/mensal");
    const dados = await res.json();

    const labels = dados.map(d => "Mês " + d.mes);
    const totais = dados.map(d => d.resolvidos);

    if (grafico) grafico.destroy();

    grafico = new Chart(document.getElementById("grafico"), {
        type: "line",
        data: {
            labels,
            datasets:[{ label:"Resolvidos", data: totais }]
        }
    });
}
