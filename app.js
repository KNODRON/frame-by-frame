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

let rotation = 0;
let selection = null;
let isDragging = false;

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
});

// Aplicar rotación
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
  const image = new Image();
  image.src = canvas.toDataURL();
  image.onload = () => {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    applyRotation();
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  };
}

// OCR sobre zona seleccionada
ocrBtn.addEventListener("click", () => {
  if (!selection) {
    ocrResult.textContent = "[Selecciona una zona con el mouse primero]";
    return;
  }

  const { x, y, width, height } = selection;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

  ocrResult.textContent = "[Analizando OCR...]";

  Tesseract.recognize(tempCanvas, 'eng', {
    logger: m => console.log(m)
  }).then(({ data: { text } }) => {
    ocrResult.textContent = text || "[No se detectó texto]";
  }).catch(err => {
    ocrResult.textContent = "[Error en OCR]";
    console.error(err);
  });
});

// Selección de zona con mouse
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
  if (isDragging && selection) {
    const rect = canvas.getBoundingClientRect();
    selection.width = (e.clientX - rect.left) - selection.x;
    selection.height = (e.clientY - rect.top) - selection.y;
    drawSelection();
  }
});

canvas.addEventListener("mouseup", () => {
  isDragging = false;
});

function drawSelection() {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#00ffcc";
  ctx.lineWidth = 2;
  if (selection) {
    ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
  }
  ctx.restore();
}
