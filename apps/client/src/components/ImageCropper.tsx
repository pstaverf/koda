import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { AVATAR_SIZE, BANNER_HEIGHT, BANNER_WIDTH } from "@koda/shared/constants";
import type { MediaKind } from "@koda/shared/profile";
import { cropImageToBlob, readFileAsDataUrl, type CropArea } from "../lib/files.js";
import { strings } from "../strings.js";
import { GlassButton } from "./GlassButton.js";
import { Modal } from "./Modal.js";

type ImageCropperProps = {
  file: File;
  kind: MediaKind;
  title: string;
  onCancel: () => void;
  onApply: (blob: Blob) => Promise<void>;
};

const output: Record<MediaKind, { width: number; height: number; aspect: number }> = {
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, aspect: 1 },
  banner: { width: BANNER_WIDTH, height: BANNER_HEIGHT, aspect: BANNER_WIDTH / BANNER_HEIGHT }
};

export const ImageCropper = ({ file, kind, title, onCancel, onApply }: ImageCropperProps) => {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readFileAsDataUrl(file).then((value) => {
      if (!cancelled) {
        setSrc(value);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setArea({
      x: croppedAreaPixels.x,
      y: croppedAreaPixels.y,
      width: croppedAreaPixels.width,
      height: croppedAreaPixels.height
    });
  }, []);

  const apply = async (): Promise<void> => {
    if (src === null || area === null) {
      return;
    }
    setBusy(true);
    try {
      const blob = await cropImageToBlob(src, area, output[kind].width, output[kind].height);
      await onApply(blob);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={title}
      onClose={onCancel}
      closeOnBackdrop={!busy}
      footer={
        <>
          <GlassButton variant="ghost" disabled={busy} onClick={onCancel}>
            {strings.register.photo.cancel}
          </GlassButton>
          <GlassButton variant="primary" loading={busy} disabled={area === null} onClick={() => void apply()}>
            {strings.register.photo.apply}
          </GlassButton>
        </>
      }
    >
      {src === null ? null : (
        <>
          <div className="cropper">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={output[kind].aspect}
              cropShape={kind === "avatar" ? "round" : "rect"}
              showGrid={false}
              objectFit="contain"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          </div>
          <input
            className="cropper-zoom"
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            aria-label={strings.register.photo.zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </>
      )}
    </Modal>
  );
};
