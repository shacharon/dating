import { authenticatedFetch } from "@/lib/authenticated-fetch";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

export type DevicePlatform = "android" | "ios" | "web";

export async function registerDeviceToken(
  token: string,
  platform: DevicePlatform,
): Promise<void> {
  const res = await authenticatedFetch("/api/v1/me/devices", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ token: token.trim(), platform }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text.trim() || `Register device failed: ${res.status}`);
  }
}

export async function unregisterDeviceToken(token: string): Promise<void> {
  const res = await authenticatedFetch("/api/v1/me/devices", {
    method: "DELETE",
    headers: JSON_HEADERS,
    body: JSON.stringify({ token: token.trim() }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text.trim() || `Unregister device failed: ${res.status}`);
  }
}
