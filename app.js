const form = document.getElementById("formulario");
const btn = document.getElementById("btnWhatsapp");

// Formatear horas automáticamente a HH:MM:SS
function autoFormatearHora(input) {
  input.addEventListener("input", function () {
    let val = this.value.replace(/\D/g, '').slice(0, 6);
    if (val.length >= 4) {
      this.value = val.replace(/(\d{2})(\d{2})(\d{0,2})/, "$1:$2:$3");
    } else if (val.length >= 2) {
      this.value = val.replace(/(\d{2})(\d{0,2})/, "$1:$2");
    } else {
      this.value = val;
    }
  });
}

autoFormatearHora(document.getElementById("horaOficial"));
autoFormatearHora(document.getElementById("horaMonitor"));

form.addEventListener("input", () => {
  const aCargo = document.getElementById("aCargo").value.trim();
  const seguimiento = document.getElementById("seguimiento").value.trim();
  const ubicacion = document.getElementById("ubicacion").value.trim();
  const comuna = document.getElementById("comuna").value.trim();
  const sentido = document.getElementById("sentido").value.trim();
  const horaOficial = document.getElementById("horaOficial").value.trim();
  const horaMonitor = document.getElementById("horaMonitor").value.trim();
  const comentario = document.getElementById("comentario").value.trim();

  const horaRegex = /^\d{2}:\d{2}:\d{2}$/;

  // Validación principal (sin exigir comentario)
  if (!aCargo || !seguimiento || !ubicacion || !comuna || !sentido || !horaOficial || !horaMonitor) {
    btn.style.display = "none";
    return;
  }

  if (!horaRegex.test(horaOficial) || !horaRegex.test(horaMonitor)) {
    btn.style.display = "none";
    return;
  }

  let texto = 
`LEVANTAMIENTO DE CÁMARAS

A CARGO: ${aCargo}
SEGUIMIENTO DE: ${seguimiento}
UBICACIÓN DE LA CÁMARA: ${ubicacion}
COMUNA: ${comuna}
SENTIDO: ${sentido}
HORA OFICIAL: ${horaOficial}
HORA MONITOR: ${horaMonitor}`;

  if (comentario !== "") {
    texto += `\nOBSERVACIÓN: ${comentario}`;
  }

  btn.href = "https://wa.me/?text=" + encodeURIComponent(texto);
  btn.style.display = "inline-block";
});
