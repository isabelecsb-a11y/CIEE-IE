let grafico;

async function carregar() {
    const res = await fetch("/dados");
    const d = await res.json();

    if (!d) {
        document.getElementById("conteudo").innerHTML = `
            <div class="empty-state">
                Nenhum relatório inserido.<br><br>
                Envie um relatório para visualizar os indicadores.
            </div>
        `;
        return;
    }

    document.getElementById("conteudo").innerHTML = `
        <div class="cards">
            <div class="card"><span>Total Tickets</span><strong>${d.total_tickets}</strong></div>
            <div class="card"><span>Resolvidos</span><strong>${d.resolvidos}</strong></div>
            <div class="card"><span>Pendentes</span><strong>${d.pendentes}</strong></div>
            <div class="card"><span>Cancelados</span><strong>${d.cancelados}</strong></div>
            <div class="card"><span>Satisfação</span><strong>${d.satisfacao}</strong></div>
        </div>
    `;

    carregarGrafico();
}

async function carregarGrafico() {
    const res = await fetch("/historico");
    const dados = await res.json();

    const labels = dados.map(d => 
        new Date(d.data).toLocaleDateString()
    );

    const resolvidos = dados.map(d => d.resolvidos);
    const pendentes = dados.map(d => d.pendentes);
    const cancelados = dados.map(d => d.cancelados);

    if (grafico) grafico.destroy();

    grafico = new Chart(document.getElementById("grafico"), {
        type: "line",
        data: {
            labels,
            datasets: [
                { label: "Resolvidos", data: resolvidos },
                { label: "Pendentes", data: pendentes },
                { label: "Cancelados", data: cancelados }
            ]
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
