"use client";

import { ReactNode, useState } from "react";
import { AutoConnect, ThirdwebProvider } from "thirdweb/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { ProfileSetupGate } from "@/components/ProfileSetupGate/ProfileSetupGate";
import { client } from "@/lib/client";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider>
        <AutoConnect client={client} />
        <AuthProvider>
          <ProfileProvider>
            <ProfileSetupGate>
              {children}
            </ProfileSetupGate>
          </ProfileProvider>
        </AuthProvider>
      </ThirdwebProvider>
    </QueryClientProvider>
  );
}
