
async function carregar() {
    const res = await fetch("/dados");
    const d = await res.json();

    if (!d) return;

    document.getElementById("cards").innerHTML = `
        <div class="card">Total Tickets <strong>${d.total_tickets}</strong></div>
        <div class="card">Resolvidos <strong>${d.resolvidos}</strong></div>
        <div class="card">Pendentes <strong>${d.pendentes}</strong></div>
        <div class="card">Cancelados <strong>${d.cancelados}</strong></div>
        <div class="card">Satisfação <strong>${d.satisfacao}</strong></div>
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
    const fd = new FormData();
    fd.append("file", file);

    await fetch("/upload", {
        method:"POST",
        body:fd
    });

    location.reload();
}

carregar();
