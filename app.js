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
const detectBtn = document.getElementById("detectBtn");

let rotation = 0;
let selection = null;
let isDragging = false;
let imageData = null;

// Cargar video
videoInput.addEventListener("change", () => {
  const file = videoInput.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    video.src = url;
  }
});

// Capturar imagen
captureBtn.addEventListener("click", () => {
  drawFilteredFrame();
});

// Aplicar brillo/contraste al canvas procesado
[brillo, contraste].forEach(control => {
  control.addEventListener("input", () => {
    if (imageData) drawFilteredFrame();
  });
});

function drawFilteredFrame() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  applyRotation();

  ctx.filter = `brightness(${brillo.value}) contrast(${contraste.value})`;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  drawCanvas();
}

// Rotación
rotateLeftBtn.addEventListener("click", () => {
  rotation -= 90;
  drawFilteredFrame();
});
rotateRightBtn.addEventListener("click", () => {
  rotation += 90;
  drawFilteredFrame();
});

function applyRotation() {
  const radians = (rotation * Math.PI) / 180;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
}

// Dibujar canvas con selección
function drawCanvas() {
  if (!imageData) return;
  ctx.putImageData(imageData, 0, 0);
  if (selection) {
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 2;
    ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
  }
}

// OCR
ocrBtn.addEventListener("click", () => {
  if (!selection) {
    ocrResult.textContent = "[Selecciona una zona con el mouse primero]";
    return;
  }

  const { x, y, width, height } = selection;

  const tempCanvas = document.createElement("canvas");
  const scaleFactor = 3;
  tempCanvas.width = width * scaleFactor;
  tempCanvas.height = height * scaleFactor;
  const tempCtx = tempCanvas.getContext("2d");

  const rawData = ctx.getImageData(x, y, width, height);
  const grayData = tempCtx.createImageData(width, height);

  for (let i = 0; i < rawData.data.length; i += 4) {
    const gray = (rawData.data[i] + rawData.data[i + 1] + rawData.data[i + 2]) / 3;
    const bin = gray > 110 ? 255 : 0;
    grayData.data[i] = bin;
    grayData.data[i + 1] = bin;
    grayData.data[i + 2] = bin;
    grayData.data[i + 3] = 255;
  }

  const smallCanvas = document.createElement("canvas");
  smallCanvas.width = width;
  smallCanvas.height = height;
  const smallCtx = smallCanvas.getContext("2d");
  smallCtx.putImageData(grayData, 0, 0);

  tempCtx.imageSmoothingEnabled = false;
  tempCtx.drawImage(smallCanvas, 0, 0, tempCanvas.width, tempCanvas.height);

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

// Selección con mouse
canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  selection = { x: e.clientX - rect.left, y: e.clientY - rect.top, width: 0, height: 0 };
  isDragging = true;
});
canvas.addEventListener("mousemove", (e) => {
  if (!isDragging || !selection) return;
  const rect = canvas.getBoundingClientRect();
  selection.width = (e.clientX - rect.left) - selection.x;
  selection.height = (e.clientY - rect.top) - selection.y;
  drawCanvas();
});
canvas.addEventListener("mouseup", () => isDragging = false);

// Limpiar selección
clearSelectionBtn.addEventListener("click", () => {
  selection = null;
  drawCanvas();
});

// Detección de vehículos con IA
let modelo = null;
cocoSsd.load().then(m => modelo = m);

detectBtn.addEventListener("click", async () => {
  if (!modelo || !imageData) return;

  ocrResult.textContent = "[Detectando vehículos...]";

  const temp = document.createElement("canvas");
  temp.width = canvas.width;
  temp.height = canvas.height;
  const tempCtx = temp.getContext("2d");
  tempCtx.putImageData(imageData, 0, 0);

  const predictions = await modelo.detect(temp);
  drawCanvas();

  predictions.forEach(p => {
    if (p.class === "car" || p.class === "truck" || p.class === "bus") {
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.bbox[0], p.bbox[1], p.bbox[2], p.bbox[3]);
      ctx.fillStyle = "red";
      ctx.font = "16px sans-serif";
      ctx.fillText(p.class, p.bbox[0], p.bbox[1] - 5);
    }
  });

  ocrResult.textContent = `[Detectados: ${predictions.length} objetos]`;
});
