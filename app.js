const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const captureBtn = document.getElementById("captureBtn");
const videoInput = document.getElementById("videoInput");
const brillo = document.getElementById("brillo");
const contraste = document.getElementById("contraste");
const ocrBtn = document.getElementById("ocrBtn");
const ocrResult = document.getElementById("ocrResult");
const rotateLeftBtn = document.getElementById("rotateLeftBtn");
const rotateRightBtn = document.getElementById("rotateRightBtn");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");

let rotation = 0;
let selection = null;
let isDragging = false;
let baseImage = null;

// Cargar video
videoInput.addEventListener("change", () => {
  const file = videoInput.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    video.src = url;
  }
});

// Capturar fotograma
captureBtn.addEventListener("click", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  selection = null;

  baseImage = new Image();
  baseImage.onload = () => redrawCanvas();
  baseImage.src = captureFrame();
});

function captureFrame() {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = video.videoWidth;
  tempCanvas.height = video.videoHeight;
  const tempCtx = tempCanvas.getContext("2d");

  tempCtx.save();
  tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
  tempCtx.rotate((rotation * Math.PI) / 180);
  tempCtx.translate(-tempCanvas.width / 2, -tempCanvas.height / 2);
  tempCtx.filter = `brightness(${brillo.value}) contrast(${contraste.value})`;
  tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.restore();

  return tempCanvas.toDataURL();
}

// Redibuja la imagen base con filtros activos
function redrawCanvas() {
  if (!baseImage) return;

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.filter = `brightness(${brillo.value}) contrast(${contraste.value})`;
  ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  if (selection) {
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 2;
    ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
  }
}

// Aplicar rotación
rotateLeftBtn.addEventListener("click", () => {
  rotation -= 90;
  baseImage.src = captureFrame();
});

rotateRightBtn.addEventListener("click", () => {
  rotation += 90;
  baseImage.src = captureFrame();
});

// Brillo y contraste en tiempo real
brillo.addEventListener("input", redrawCanvas);
contraste.addEventListener("input", redrawCanvas);

// Limpiar selección
clearSelectionBtn.addEventListener("click", () => {
  selection = null;
  redrawCanvas();
});

// Selección con mouse
canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  selection = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    width: 0,
    height: 0
  };
  isDragging = true;
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDragging || !selection) return;
  const rect = canvas.getBoundingClientRect();
  selection.width = (e.clientX - rect.left) - selection.x;
  selection.height = (e.clientY - rect.top) - selection.y;
  redrawCanvas();
});

canvas.addEventListener("mouseup", () => {
  isDragging = false;
});

// OCR con preprocesamiento y zoom real
ocrBtn.addEventListener("click", () => {
  if (!selection) {
    ocrResult.textContent = "[Selecciona una zona con el mouse primero]";
    return;
  }

  const { x, y, width, height } = selection;
  const scaleFactor = 3;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width * scaleFactor;
  tempCanvas.height = height * scaleFactor;
  const tempCtx = tempCanvas.getContext("2d");

  tempCtx.imageSmoothingEnabled = false;
  tempCtx.filter = `brightness(${brillo.value}) contrast(${contraste.value})`;

  // Extraer zona y escalar
  tempCtx.drawImage(canvas, x, y, width, height, 0, 0, tempCanvas.width, tempCanvas.height);

  // Convertir a grises + binarizar
  const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const avg = (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
    const bin = avg > 110 ? 255 : 0;
    imgData.data[i] = bin;
    imgData.data[i + 1] = bin;
    imgData.data[i + 2] = bin;
  }
  tempCtx.putImageData(imgData, 0, 0);

  // Mostrar la imagen tratada visualmente (opcional)
  // document.body.appendChild(tempCanvas); // <-- activar si quieres verla

  ocrResult.textContent = "[Analizando OCR con preprocesamiento...]";

  Tesseract.recognize(tempCanvas, 'eng', {
    logger: m => console.log(m)
  }).then(({ data: { text } }) => {
    const textoOriginal = text.trim();
    let limpio = textoOriginal.replace(/[^A-Z0-9]/gi, "").toUpperCase();

    const patrones = [
      /^[A-Z]{2}[A-Z]{2}[0-9]{2}$/,
      /^[A-Z]{3}[0-9]{2,3}$/,
      /^[RPZ]{1}[0-9]{3,5}$/,
      /^[A-Z]{2}[0-9]{2,4}$/,
      /^[A-Z]{1,4}[0-9]{1,4}$/
    ];

    const esPatente = patrones.some(p => limpio.match(p));

    if (limpio && esPatente) {
      ocrResult.textContent = `🧠 Texto detectado: ${textoOriginal}\n✅ Posible patente: ${limpio}`;
    } else {
      ocrResult.textContent = `🧠 Texto detectado: ${textoOriginal}\n❌ No parece ser una patente chilena`;
    }
  }).catch(err => {
    ocrResult.textContent = "[Error en OCR]";
    console.error(err);
  });
});
const detectarVehiculosBtn = document.getElementById("detectarVehiculosBtn");

let cocoModel = null;

// Cargar modelo al inicio
cocoSsd.load().then(model => {
  cocoModel = model;
  console.log("✅ Modelo COCO-SSD cargado");
});

// Detección sobre imagen actual del canvas
detectarVehiculosBtn.addEventListener("click", async () => {
  if (!cocoModel || !baseImage) {
    alert("Modelo aún cargando o no se ha capturado imagen.");
    return;
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

  const predictions = await cocoModel.detect(tempCanvas);

  redrawCanvas();

  predictions.forEach(pred => {
    if (["car", "truck", "bus", "motorcycle"].includes(pred.class) && pred.score > 0.5) {
      const [x, y, w, h] = pred.bbox;

      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "#00ff00";
      ctx.font = "14px monospace";
      ctx.fillText(`${pred.class} (${(pred.score * 100).toFixed(1)}%)`, x, y - 5);
    }
  });

  if (predictions.length === 0) {
    ocrResult.textContent = "[No se detectaron vehículos]";
  }
});
