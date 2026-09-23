"use client";

import { ReactNode, useState } from "react";
import { AutoConnect, ThirdwebProvider } from "thirdweb/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { TeamProvider } from "@/context/TeamContext";
import { ProfileSetupGate } from "@/components/ProfileSetupGate/ProfileSetupGate";
import { client } from "@/lib/client";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15 * 1000, // 15 seconds fresh
            gcTime: 5 * 60 * 1000, // 5 minutes cache retention
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider>
        <AutoConnect client={client} />
        <AuthProvider>
          <ProfileProvider>
            <TeamProvider>
              <ProfileSetupGate>
                {children}
              </ProfileSetupGate>
            </TeamProvider>
          </ProfileProvider>
        </AuthProvider>
      </ThirdwebProvider>
      <Toaster position="top-center" reverseOrder={false} />
    </QueryClientProvider>
  );
}
