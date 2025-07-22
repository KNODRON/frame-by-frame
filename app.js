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
let imageData = null;

// Cargar video
videoInput.addEventListener("change", () => {
  const file = videoInput.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    video.src = url;
  }
});

// Capturar imagen con filtros aplicados
captureBtn.addEventListener("click", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  applyRotation();

  ctx.filter = `brightness(${brillo.value}) contrast(${contraste.value})`;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  selection = null;
  drawCanvas();
});

// Rotación
rotateLeftBtn.addEventListener("click", () => {
  rotation -= 90;
  redrawCanvas();
});

rotateRightBtn.addEventListener("click", () => {
  rotation += 90;
  redrawCanvas();
});

function applyRotation() {
  const radians = (rotation * Math.PI) / 180;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
}

function redrawCanvas() {
  if (!imageData) return;
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  applyRotation();
  ctx.putImageData(imageData, 0, 0);
  ctx.restore();
  drawCanvas();
}

function drawCanvas() {
  if (!imageData) return;
  ctx.putImageData(imageData, 0, 0);

  if (selection) {
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 2;
    ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
  }
}

// OCR sobre zona seleccionada + validación
ocrBtn.addEventListener("click", () => {
  if (!selection) {
    ocrResult.textContent = "[Selecciona una zona con el mouse primero]";
    return;
  }

  const { x, y, width, height } = selection;

  // Crear canvas temporal para preprocesamiento
  const tempCanvas = document.createElement("canvas");
  const scaleFactor = 3; // Aumentamos resolución para OCR
  tempCanvas.width = width * scaleFactor;
  tempCanvas.height = height * scaleFactor;
  const tempCtx = tempCanvas.getContext("2d");

  // Extraer imagen original desde el canvas
  const rawData = ctx.getImageData(x, y, width, height);

  // Preprocesamiento: convertir a escala de grises + binarización
  let grayData = tempCtx.createImageData(width, height);
  for (let i = 0; i < rawData.data.length; i += 4) {
    const r = rawData.data[i];
    const g = rawData.data[i + 1];
    const b = rawData.data[i + 2];
    const gray = (r + g + b) / 3;

    const bin = gray > 110 ? 255 : 0; // Umbral binarizado

    grayData.data[i] = bin;
    grayData.data[i + 1] = bin;
    grayData.data[i + 2] = bin;
    grayData.data[i + 3] = 255;
  }

  // Dibujar imagen binarizada y escalar
  const tempSmallCanvas = document.createElement("canvas");
  tempSmallCanvas.width = width;
  tempSmallCanvas.height = height;
  const smallCtx = tempSmallCanvas.getContext("2d");
  smallCtx.putImageData(grayData, 0, 0);

  // Escalar a canvas grande
  tempCtx.imageSmoothingEnabled = false;
  tempCtx.drawImage(tempSmallCanvas, 0, 0, width * scaleFactor, height * scaleFactor);

  // Mostrar estado
  ocrResult.textContent = "[Analizando OCR con preprocesamiento...]";

  // OCR sobre imagen procesada
  Tesseract.recognize(tempCanvas, 'eng', {
    logger: m => console.log(m)
  }).then(({ data: { text } }) => {
    const textoOriginal = text.trim();
    let limpio = textoOriginal.replace(/[^A-Z0-9]/gi, "").toUpperCase();

    const patrones = [
      /^[A-Z]{2}[A-Z]{2}[0-9]{2}$/,       // BBWB40, CD0510
      /^[A-Z]{3}[0-9]{2,3}$/,             // BJH61, VPU184
      /^[RPZ]{1}[0-9]{3,5}$/,             // RP2001, Z3750
      /^[A-Z]{2}[0-9]{2,4}$/,             // JA1000, WS1900
      /^[A-Z]{1,4}[0-9]{1,4}$/            // General
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
