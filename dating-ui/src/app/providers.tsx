"use client";

import { LocaleDocumentSync } from "@/components/locale-document-sync";
import { ProductErrorBoundary } from "@/components/product-error-boundary";
import { AuthProvider } from "@/contexts/auth-context";
import { createAppQueryClient } from "@/lib/create-app-query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

function AppQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createAppQueryClient());
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ProductErrorBoundary>
      <AppQueryProvider>
        <AuthProvider>
          <LocaleDocumentSync />
          {children}
        </AuthProvider>
      </AppQueryProvider>
    </ProductErrorBoundary>
  );
}
