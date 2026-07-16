/**
 * Compressione foto colonie → JPEG dataURL (IndexedDB-friendly, offline)
 */

/**
 * @param {File|Blob} file
 * @param {{ maxSize?: number, quality?: number }} [opts]
 * @returns {Promise<string>} data:image/jpeg;base64,...
 */
export function fileToCoverDataUrl(file, opts = {}) {
  const maxSize = opts.maxSize ?? 960;
  const quality = opts.quality ?? 0.72;

  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || '').startsWith('image/')) {
      reject(new Error('Seleziona un’immagine valida'));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        let { width, height } = img;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas non disponibile');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Impossibile leggere l’immagine'));
    };

    img.src = objectUrl;
  });
}

/** Hash stabile per gradienti placeholder per specie/nome */
export function hueFromString(str) {
  let h = 0;
  const s = String(str || 'ant');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function placeholderStyle(seed) {
  const h = hueFromString(seed);
  return `background: linear-gradient(145deg, hsl(${h} 42% 22%) 0%, hsl(${(h + 40) % 360} 35% 12%) 55%, hsl(${(h + 18) % 360} 28% 8%) 100%);`;
}
