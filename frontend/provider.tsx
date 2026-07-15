"use client";

import { ReactNode, useState } from "react";
import { ThirdwebProvider } from "thirdweb/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThirdwebProvider>
    </QueryClientProvider>
  );
}
