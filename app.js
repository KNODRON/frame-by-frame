const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const captureBtn = document.getElementById("captureBtn");
const videoInput = document.getElementById("videoInput");
const brillo = document.getElementById("brillo");
const contraste = document.getElementById("contraste");
const ocrBtn = document.getElementById("ocrBtn");
const ocrResult = document.getElementById("ocrResult");

videoInput.addEventListener("change", () => {
  const file = videoInput.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    video.src = url;
  }
});

captureBtn.addEventListener("click", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.filter = `brightness(${brillo.value}) contrast(${contraste.value})`;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
});

ocrBtn.addEventListener("click", () => {
  ocrResult.textContent = "[Analizando...]";
  Tesseract.recognize(canvas, 'eng', {
    logger: m => console.log(m)
  }).then(({ data: { text } }) => {
    ocrResult.textContent = text || "[No se detectó texto]";
  }).catch(err => {
    ocrResult.textContent = "[Error al procesar OCR]";
    console.error(err);
  });
});
