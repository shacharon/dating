import { isCapacitor } from "@/lib/platform";

export class ProfilePhotoPickCancelledError extends Error {
  constructor() {
    super("Profile photo pick cancelled");
    this.name = "ProfilePhotoPickCancelledError";
  }
}

export class ProfilePhotoPermissionDeniedError extends Error {
  constructor() {
    super("Camera permission denied");
    this.name = "ProfilePhotoPermissionDeniedError";
  }
}

const ALLOWED_FORMATS = new Set(["jpeg", "jpg", "png", "webp"]);

function isUserCancelError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /cancel/i.test(msg);
}

/** Web → null (caller uses file input). Capacitor → native pick → File. */
export async function pickProfilePhotoFile(): Promise<File | null> {
  if (!isCapacitor()) {
    return null;
  }

  const { Camera, CameraResultType, CameraSource } = await import(
    "@capacitor/camera"
  );

  const perm = await Camera.checkPermissions();
  const needsRequest = perm.camera !== "granted" || perm.photos !== "granted";
  if (needsRequest) {
    const req = await Camera.requestPermissions({
      permissions: ["camera", "photos"],
    });
    if (req.camera !== "granted" && req.photos !== "granted") {
      throw new ProfilePhotoPermissionDeniedError();
    }
  }

  let photo;
  try {
    photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
    });
  } catch (err) {
    if (isUserCancelError(err)) {
      throw new ProfilePhotoPickCancelledError();
    }
    throw err;
  }

  const format = photo.format?.toLowerCase() ?? "jpeg";
  if (!ALLOWED_FORMATS.has(format)) {
    throw new Error(`Unsupported image format: ${format}`);
  }

  const webPath = photo.webPath;
  if (!webPath) {
    throw new Error("Camera returned no image path");
  }

  const res = await fetch(webPath);
  const blob = await res.blob();
  const mime =
    format === "png"
      ? "image/png"
      : format === "webp"
        ? "image/webp"
        : "image/jpeg";
  const ext = format === "jpg" ? "jpeg" : format;
  return new File([blob], `profile-photo.${ext}`, { type: mime });
}
