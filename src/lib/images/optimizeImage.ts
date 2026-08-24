export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  minQuality?: number;
  qualityStep?: number;
  maxInputBytes?: number;
  maxOutputBytes?: number;
}

export interface OptimizedImageResult {
  file: File;
  originalBytes: number;
  optimizedBytes: number;
  width: number;
  height: number;
}

const DEFAULT_MAX_INPUT_BYTES =
  5 * 1024 * 1024;

const DEFAULT_MAX_OUTPUT_BYTES =
  180 * 1024;

async function canvasToWebp(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise<Blob>(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Unable to optimize image.",
              ),
            );
            return;
          }

          resolve(blob);
        },
        "image/webp",
        quality,
      );
    },
  );
}

export async function optimizeImage(
  inputFile: File,
  options: OptimizeImageOptions = {},
): Promise<OptimizedImageResult> {
  const {
    maxWidth = 800,
    maxHeight = 800,

    quality = 0.78,
    minQuality = 0.42,
    qualityStep = 0.08,

    maxInputBytes =
      DEFAULT_MAX_INPUT_BYTES,

    maxOutputBytes =
      DEFAULT_MAX_OUTPUT_BYTES,
  } = options;

  if (
    inputFile.size >
    maxInputBytes
  ) {
    throw new Error(
      "Image must be 5 MB or smaller.",
    );
  }

  if (
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(inputFile.type)
  ) {
    throw new Error(
      "Only JPG, PNG and WebP images are allowed.",
    );
  }

  const bitmap =
    await createImageBitmap(
      inputFile,
    );

  const scale = Math.min(
    1,
    maxWidth / bitmap.width,
    maxHeight / bitmap.height,
  );

  const width = Math.max(
    1,
    Math.round(
      bitmap.width * scale,
    ),
  );

  const height = Math.max(
    1,
    Math.round(
      bitmap.height * scale,
    ),
  );

  const canvas =
    document.createElement(
      "canvas",
    );

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext("2d");

  if (!context) {
    bitmap.close();

    throw new Error(
      "Unable to process image.",
    );
  }

  context.drawImage(
    bitmap,
    0,
    0,
    width,
    height,
  );

  bitmap.close();

  let currentQuality =
    quality;

  let blob =
    await canvasToWebp(
      canvas,
      currentQuality,
    );

  while (
    blob.size >
      maxOutputBytes &&
    currentQuality >
      minQuality
  ) {
    currentQuality =
      Math.max(
        minQuality,
        currentQuality -
          qualityStep,
      );

    blob =
      await canvasToWebp(
        canvas,
        currentQuality,
      );

    if (
      currentQuality ===
      minQuality
    ) {
      break;
    }
  }

  if (
    blob.size >
    maxOutputBytes
  ) {
    throw new Error(
      "Image could not be reduced below 180 KB. Please choose a simpler or smaller image.",
    );
  }

  const baseName =
    inputFile.name
      .replace(
        /\.[^.]+$/,
        "",
      )
      .replace(
        /[^a-zA-Z0-9-_]+/g,
        "-",
      )
      .replace(
        /^[-_]+|[-_]+$/g,
        "",
      ) || "listing-image";

  const optimizedFile =
    new File(
      [blob],
      `${baseName}.webp`,
      {
        type:
          "image/webp",

        lastModified:
          Date.now(),
      },
    );

  return {
    file:
      optimizedFile,

    originalBytes:
      inputFile.size,

    optimizedBytes:
      optimizedFile.size,

    width,
    height,
  };
}