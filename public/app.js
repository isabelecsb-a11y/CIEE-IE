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

    new Chart(document.getElementById("grafico"), {
        type: "bar",
        data: {
            labels:["Resolvidos","Pendentes","Cancelados"],
            datasets:[{
                data:[d.resolvidos,d.pendentes,d.cancelados]
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
