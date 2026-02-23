let grafico;
let abaAtual = "geral";

function trocarAba(aba) {
    abaAtual = aba;

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    event.target.classList.add("active");

    carregar();
}

async function carregar() {
    const res = await fetch("/dados");
    const d = await res.json();

    if (!d) {
        document.getElementById("conteudo").innerHTML = `
            <div class="card">Nenhum relatório inserido</div>
        `;
        if (grafico) grafico.destroy();
        return;
    }

    if (abaAtual === "geral") {
        document.getElementById("conteudo").innerHTML = `
            <div class="cards">
                <div class="card"><span>Total</span><strong>${d.total || "-"}</strong></div>
                <div class="card"><span>Resolvidos</span><strong>${d.resolvidos || "-"}</strong></div>
                <div class="card"><span>Satisfação</span><strong>${d.satisfacao || "-"}</strong></div>
            </div>
        `;

        carregarGraficoLinha();
    }
}

async function carregarGraficoLinha() {
    const res = await fetch("/historico");
    const dados = await res.json();

    const labels = dados.map(d => new Date(d.data).toLocaleDateString());
    const totais = dados.map(d => d.total);

    if (grafico) grafico.destroy();

    grafico = new Chart(document.getElementById("grafico"), {
        type: "line",
        data: {
            labels,
            datasets:[{
                label:"Evolução",
                data: totais
            }]
        }
    });
}

async function upload() {
    const file = document.getElementById("file").files[0];
    if (!file) return alert("Selecione um arquivo");

    const fd = new FormData();
    fd.append("file", file);

    await fetch("/upload", {
        method:"POST",
        body:fd
    });

    location.reload();
}

carregar();
