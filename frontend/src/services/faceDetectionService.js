export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
let loading;

export function validatePhoto(file) {
  if (!file || !['image/jpeg', 'image/png'].includes(file.type))
    throw new Error('Seleccione una fotografía JPG, JPEG o PNG.');
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES)
    throw new Error('La fotografía debe tener contenido y pesar como máximo 5 MB.');
}

async function loadModels() {
  if (!loading) {
    loading = (async () => {
      const faceapi = await import('face-api.js');
      const path = `${import.meta.env.BASE_URL}models/face-api`;
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(path),
        faceapi.nets.faceLandmark68Net.loadFromUri(path),
        faceapi.nets.faceRecognitionNet.loadFromUri(path),
      ]);
      return faceapi;
    })().catch(() => {
      loading = null;
      throw new Error('No se pudieron cargar los modelos faciales. Revise la conexión y vuelva a analizar.');
    });
  }
  return loading;
}

export async function analyzePhoto(image) {
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('No se pudo leer la fotografía.');
  if (image.naturalWidth * image.naturalHeight > 20000000)
    throw new Error('La fotografía supera los 20 megapíxeles. Reduzca su resolución.');
  const faceapi = await loadModels();
  // Resize large photos before inference to bound browser memory use.
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  try {
    const faces = await faceapi.detectAllFaces(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks().withFaceDescriptors();
    if (faces.length === 0) throw new Error('No se detectó ningún rostro. Use una foto frontal, nítida y bien iluminada.');
    if (faces.length !== 1) throw new Error('La fotografía debe contener exactamente un rostro.');
    const { detection, descriptor } = faces[0];
    if (detection.score < 0.8 || Math.min(detection.box.width, detection.box.height) < 80)
      throw new Error('La calidad del rostro es insuficiente. Use una fotografía más cercana y nítida.');
    const values = Array.from(descriptor);
    if (values.length !== 128 || !values.every(Number.isFinite))
      throw new Error('No se pudo generar un descriptor válido. Pruebe otra fotografía.');
    return values;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
