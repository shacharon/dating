import type { Viewport } from "next";

/** Root viewport — static-safe; included in Capacitor export HTML. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
