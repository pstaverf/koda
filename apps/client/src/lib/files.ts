import { mediaMaxBytes, type MediaKind } from "@koda/shared/profile";
import type { ClientErrorCode } from "../strings.js";

export const imageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageType = (typeof imageTypes)[number];

const extensions: Record<ImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export const isSupportedImageType = (type: string): type is ImageType =>
  imageTypes.includes(type as ImageType);

export const validateImageFile = (file: File, kind: MediaKind): ClientErrorCode | null => {
  if (!isSupportedImageType(file.type)) {
    return "MEDIA_TYPE_UNSUPPORTED";
  }
  return file.size > mediaMaxBytes[kind] ? "MEDIA_TOO_LARGE" : null;
};

export const uploadFileName = (type: string, kind: MediaKind): string =>
  `${kind}.${isSupportedImageType(type) ? extensions[type] : "jpg"}`;

export const toFormData = (field: string, blob: Blob, fileName: string): FormData => {
  const form = new FormData();
  form.append(field, blob, fileName);
  return form;
};

export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("read failed"));
      }
    };
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image failed"));
    image.src = src;
  });

export const cropImageToBlob = async (src: string, area: CropArea, width: number, height: number): Promise<Blob> => {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("canvas unavailable");
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error("encode failed"));
        } else {
          resolve(blob);
        }
      },
      "image/jpeg",
      0.92
    );
  });
};
