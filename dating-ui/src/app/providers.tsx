"use client";

import { ProductErrorBoundary } from "@/components/product-error-boundary";
import { AuthProvider } from "@/contexts/auth-context";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ProductErrorBoundary>
      <AuthProvider>{children}</AuthProvider>
    </ProductErrorBoundary>
  );
}
