/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { setPlatformOverrideForTests } from "@/lib/platform/platform";

const checkPermissions = vi.fn();
const requestPermissions = vi.fn();
const getPhoto = vi.fn();

vi.mock("@capacitor/camera", () => ({
  Camera: {
    checkPermissions,
    requestPermissions,
    getPhoto,
  },
  CameraResultType: { Uri: "uri" },
  CameraSource: { Prompt: "PROMPT" },
}));

import {
  pickProfilePhotoFile,
  ProfilePhotoPermissionDeniedError,
  ProfilePhotoPickCancelledError,
} from "./pick-profile-photo";

describe("pickProfilePhotoFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPlatformOverrideForTests(null);
    checkPermissions.mockResolvedValue({ camera: "granted", photos: "granted" });
    requestPermissions.mockResolvedValue({ camera: "granted", photos: "granted" });
    getPhoto.mockResolvedValue({
      webPath: "blob:http://localhost/fake",
      format: "jpeg",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
      }),
    );
  });

  afterEach(() => {
    setPlatformOverrideForTests(null);
    vi.unstubAllGlobals();
  });

  it("returns null on web without calling Camera", async () => {
    const result = await pickProfilePhotoFile();
    expect(result).toBeNull();
    expect(getPhoto).not.toHaveBeenCalled();
  });

  it("returns File with jpeg mime on capacitor success", async () => {
    setPlatformOverrideForTests("capacitor");

    const file = await pickProfilePhotoFile();

    expect(file).toBeInstanceOf(File);
    expect(file?.type).toBe("image/jpeg");
    expect(file?.name).toBe("profile-photo.jpeg");
    expect(getPhoto).toHaveBeenCalledWith(
      expect.objectContaining({
        quality: 90,
        allowEditing: false,
        source: "PROMPT",
      }),
    );
  });

  it("returns png File when format is png", async () => {
    setPlatformOverrideForTests("capacitor");
    getPhoto.mockResolvedValue({
      webPath: "blob:http://localhost/png",
      format: "png",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(["x"], { type: "image/png" })),
      }),
    );

    const file = await pickProfilePhotoFile();

    expect(file?.type).toBe("image/png");
    expect(file?.name).toBe("profile-photo.png");
  });

  it("throws ProfilePhotoPickCancelledError when user cancels", async () => {
    setPlatformOverrideForTests("capacitor");
    getPhoto.mockRejectedValue(new Error("User cancelled photos app"));

    await expect(pickProfilePhotoFile()).rejects.toThrow(
      ProfilePhotoPickCancelledError,
    );
  });

  it("throws ProfilePhotoPermissionDeniedError when both permissions denied", async () => {
    setPlatformOverrideForTests("capacitor");
    checkPermissions.mockResolvedValue({ camera: "prompt", photos: "prompt" });
    requestPermissions.mockResolvedValue({ camera: "denied", photos: "denied" });

    await expect(pickProfilePhotoFile()).rejects.toThrow(
      ProfilePhotoPermissionDeniedError,
    );
    expect(getPhoto).not.toHaveBeenCalled();
  });

  it("proceeds when camera granted even if photos denied", async () => {
    setPlatformOverrideForTests("capacitor");
    checkPermissions.mockResolvedValue({ camera: "prompt", photos: "prompt" });
    requestPermissions.mockResolvedValue({ camera: "granted", photos: "denied" });

    const file = await pickProfilePhotoFile();

    expect(file).toBeInstanceOf(File);
    expect(getPhoto).toHaveBeenCalled();
  });

  it("rejects unsupported formats", async () => {
    setPlatformOverrideForTests("capacitor");
    getPhoto.mockResolvedValue({
      webPath: "blob:http://localhost/heic",
      format: "heic",
    });

    await expect(pickProfilePhotoFile()).rejects.toThrow(
      "Unsupported image format: heic",
    );
  });

  it("returns webp File when format is webp", async () => {
    setPlatformOverrideForTests("capacitor");
    getPhoto.mockResolvedValue({
      webPath: "blob:http://localhost/webp",
      format: "webp",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(["x"], { type: "image/webp" })),
      }),
    );

    const file = await pickProfilePhotoFile();

    expect(file?.type).toBe("image/webp");
    expect(file?.name).toBe("profile-photo.webp");
  });

  it("throws when camera returns no webPath", async () => {
    setPlatformOverrideForTests("capacitor");
    getPhoto.mockResolvedValue({ format: "jpeg" });

    await expect(pickProfilePhotoFile()).rejects.toThrow(
      "Camera returned no image path",
    );
  });

  it("propagates non-cancel getPhoto errors", async () => {
    setPlatformOverrideForTests("capacitor");
    getPhoto.mockRejectedValue(new Error("Camera hardware unavailable"));

    await expect(pickProfilePhotoFile()).rejects.toThrow(
      "Camera hardware unavailable",
    );
  });

  it("skips requestPermissions when both already granted", async () => {
    setPlatformOverrideForTests("capacitor");
    checkPermissions.mockResolvedValue({ camera: "granted", photos: "granted" });

    await pickProfilePhotoFile();

    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it("proceeds when photos granted even if camera denied", async () => {
    setPlatformOverrideForTests("capacitor");
    checkPermissions.mockResolvedValue({ camera: "prompt", photos: "prompt" });
    requestPermissions.mockResolvedValue({ camera: "denied", photos: "granted" });

    const file = await pickProfilePhotoFile();

    expect(file).toBeInstanceOf(File);
    expect(getPhoto).toHaveBeenCalled();
  });
});

describe("pick-profile-photo security invariants", () => {
  it("does not log file paths or image bytes", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "pick-profile-photo.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/productLogger|console\.(log|debug|info|warn)/);
  });

  it("rejects formats outside the jpeg/png/webp allowlist", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "pick-profile-photo.ts"),
      "utf8",
    );
    expect(src).toContain('"jpeg"');
    expect(src).toContain('"webp"');
    expect(src).toContain("ALLOWED_FORMATS");
    expect(src).not.toContain('"heic"');
  });
});
