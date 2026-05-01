/**
 * Compress an image file to reduce upload size.
 * Resizes to max 1024px on longest side and converts to JPEG at 80% quality.
 */
export async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX = 1024;
                let w = img.width, h = img.height;
                if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0, w, h);
                    canvas.toBlob(
                        (blob) => resolve(blob ? new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }) : file),
                        "image/jpeg",
                        0.8
                    );
                } else {
                    resolve(file);
                }
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
}
