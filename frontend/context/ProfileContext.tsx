"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ProfileContextType {
  fullName: string | null;
  /** Company display name — non-null only for role === "merchant" accounts. */
  companyName: string | null;
  username: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  subscriptionActive: boolean;
  role: "user" | "merchant";
  plan: "free" | "pro_lite" | "pro_starter" | "pro_growth" | "pro_scale" | "pro" | "enterprise";
  billingCycle: "monthly" | "yearly";
  billingCycleStart: string | null;
  shipmentsThisMonth: number;
  rolloverQuota: number;
  overageCharges: number;
  apiKey: string | null;
  testApiKey: string | null;
  apiKeyMasked: string | null;
  testApiKeyMasked: string | null;
  webhookUrl: string | null;
  isProfileLoaded: boolean;
  isNewUser: boolean;
  isOpenSetup: boolean;
  isError: boolean;
  openProfileSetup: () => void;
  closeProfileSetup: () => void;
  refetchProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const account = useActiveAccount();
  const queryClient = useQueryClient();
  const [isOpenSetup, setIsOpenSetup] = useState(false);

  const walletAddress = account?.address?.toLowerCase() || null;

  const {
    data: profileData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["profile", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const res = await fetch(`/api/profile?walletAddress=${walletAddress}`, {
        headers: { "x-owner-address": walletAddress },
      });
      if (res.status === 404) {
        return { isNotFound: true };
      }
      if (!res.ok) {
        throw new Error("Failed to fetch profile");
      }
      return res.json();
    },
    enabled: !!walletAddress,
    retry: 1,
    staleTime: 5000,
  });

  const isProfileLoaded = !isLoading;
  const isNewUser = !!walletAddress && isProfileLoaded && profileData && "isNotFound" in profileData && profileData.isNotFound;

  // Auto-open modal if the user is logged in but doesn't have a profile yet
  useEffect(() => {
    if (isNewUser) {
      setIsOpenSetup(true);
    } else {
      setIsOpenSetup(false);
    }
  }, [isNewUser]);

  const openProfileSetup = useCallback(() => setIsOpenSetup(true), []);
  const closeProfileSetup = useCallback(() => setIsOpenSetup(false), []);

  const refetchProfile = useCallback(() => {
    if (walletAddress) {
      queryClient.invalidateQueries({ queryKey: ["profile", walletAddress] });
    }
  }, [walletAddress, queryClient]);

  const fullName = profileData && !("isNotFound" in profileData) ? profileData.fullName : null;
  const companyName = profileData && !("isNotFound" in profileData) ? profileData.companyName || null : null;
  const username = profileData && !("isNotFound" in profileData) ? profileData.username : null;
  const phone = profileData && !("isNotFound" in profileData) ? profileData.phone || null : null;
  const whatsapp = profileData && !("isNotFound" in profileData) ? profileData.whatsapp || null : null;
  const email = profileData && !("isNotFound" in profileData) ? profileData.email || null : null;
  const subscriptionActive = profileData && !("isNotFound" in profileData) ? Boolean(profileData.subscriptionActive) : false;
  const role = profileData && !("isNotFound" in profileData) ? profileData.role || "user" : "user";
  const plan = profileData && !("isNotFound" in profileData) ? profileData.plan || "free" : "free";
  const billingCycle = profileData && !("isNotFound" in profileData) ? profileData.billingCycle || "monthly" : "monthly";
  const billingCycleStart = profileData && !("isNotFound" in profileData) ? profileData.billingCycleStart || null : null;
  const shipmentsThisMonth = profileData && !("isNotFound" in profileData) ? Number(profileData.shipmentsThisMonth || 0) : 0;
  const rolloverQuota = profileData && !("isNotFound" in profileData) ? Number(profileData.rolloverQuota || 0) : 0;
  const overageCharges = profileData && !("isNotFound" in profileData) ? Number(profileData.overageCharges || 0) : 0;
  const apiKey = profileData && !("isNotFound" in profileData) ? profileData.apiKey || null : null;
  const testApiKey = profileData && !("isNotFound" in profileData) ? profileData.testApiKey || null : null;
  const apiKeyMasked = profileData && !("isNotFound" in profileData) ? profileData.apiKeyMasked || (apiKey ? `${apiKey.substring(0, 13)}••••${apiKey.slice(-4)}` : null) : null;
  const testApiKeyMasked = profileData && !("isNotFound" in profileData) ? profileData.testApiKeyMasked || (testApiKey ? `${testApiKey.substring(0, 13)}••••${testApiKey.slice(-4)}` : null) : null;
  const webhookUrl = profileData && !("isNotFound" in profileData) ? profileData.webhookUrl || null : null;

  const contextValue = useMemo(
    () => ({
      fullName,
      companyName,
      username,
      phone,
      whatsapp,
      email,
      subscriptionActive,
      role,
      plan,
      billingCycle,
      billingCycleStart,
      shipmentsThisMonth,
      rolloverQuota,
      overageCharges,
      apiKey,
      testApiKey,
      apiKeyMasked,
      testApiKeyMasked,
      webhookUrl,
      isProfileLoaded,
      isNewUser,
      isOpenSetup,
      isError,
      openProfileSetup,
      closeProfileSetup,
      refetchProfile,
    }),
    [
      fullName,
      companyName,
      username,
      phone,
      whatsapp,
      email,
      subscriptionActive,
      role,
      plan,
      billingCycle,
      billingCycleStart,
      shipmentsThisMonth,
      rolloverQuota,
      overageCharges,
      apiKey,
      testApiKey,
      apiKeyMasked,
      testApiKeyMasked,
      webhookUrl,
      isProfileLoaded,
      isNewUser,
      isOpenSetup,
      isError,
      openProfileSetup,
      closeProfileSetup,
      refetchProfile,
    ]
  );

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
