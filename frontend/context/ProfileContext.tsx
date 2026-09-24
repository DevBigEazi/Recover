"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";


interface ProfileContextType {
  fullName: string | null;
  /** Company/business display name */
  companyName: string | null;
  /** Business logo Base64 or URL */
  businessLogo: string | null;
  /** Dedicated customer support phone line for merchants */
  businessPhone: string | null;
  /** Dedicated business/invoice email for merchants */
  businessEmail: string | null;
  username: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  subscriptionActive: boolean;
  role: "user" | "merchant";
  /** Currently active UI navigation mode */
  activeMode: "personal" | "merchant";
  /** Whether the user has configured personal details */
  hasPersonalProfile: boolean;
  /** Whether the user has configured business/merchant details */
  hasMerchantProfile: boolean;
  switchMode: (targetMode: "personal" | "merchant") => Promise<void>;
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

  // When a personal wallet session is established, clear any active workspace staff session.
  // Staff login (email + PIN) and personal Recover login cannot co-exist in the same browser.
  useEffect(() => {
    if (!walletAddress) return;
    fetch("/api/workspace/logout", { method: "POST" }).catch(() => {
      // best-effort — no action needed if it fails
    });
  }, [walletAddress]);

  const [localMode, setLocalMode] = useState<"personal" | "merchant" | null>(null);

  // Sync initial localMode from profileData or fallback to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("recover_active_mode") as "personal" | "merchant" | null;
      if (savedMode === "personal" || savedMode === "merchant") {
        setLocalMode(savedMode);
      }
    }
  }, []);

  const openProfileSetup = useCallback(() => setIsOpenSetup(true), []);
  const closeProfileSetup = useCallback(() => setIsOpenSetup(false), []);

  const refetchProfile = useCallback(() => {
    if (walletAddress) {
      queryClient.invalidateQueries({ queryKey: ["profile", walletAddress] });
    }
  }, [walletAddress, queryClient]);

  const fullName = profileData && !("isNotFound" in profileData) ? profileData.fullName : null;
  const companyName = profileData && !("isNotFound" in profileData) ? profileData.companyName || null : null;
  const businessLogo = profileData && !("isNotFound" in profileData) ? profileData.businessLogo || null : null;
  const businessPhone = profileData && !("isNotFound" in profileData) ? profileData.businessPhone || null : null;
  const businessEmail = profileData && !("isNotFound" in profileData) ? profileData.businessEmail || null : null;
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

  const hasMerchantProfile = Boolean(
    profileData &&
      !("isNotFound" in profileData) &&
      (profileData.hasMerchantProfile || Boolean(profileData.companyName))
  );

  const hasPersonalProfile = Boolean(
    profileData &&
      !("isNotFound" in profileData) &&
      (profileData.hasPersonalProfile ||
        (Boolean(profileData.username) &&
          Boolean(profileData.phone || profileData.whatsapp || profileData.email)))
  );

  // If user only has merchant profile, activeMode defaults to merchant.
  // If user only has personal profile, activeMode defaults to personal.
  // If user has both, respect localMode or server activeMode.
  const activeMode: "personal" | "merchant" =
    !hasPersonalProfile && hasMerchantProfile
      ? "merchant"
      : !hasMerchantProfile && hasPersonalProfile
      ? "personal"
      : localMode ||
        (profileData &&
        !("isNotFound" in profileData) &&
        (profileData.activeMode === "personal" || profileData.activeMode === "merchant")
          ? profileData.activeMode
          : hasMerchantProfile
          ? "merchant"
          : "personal");

  const switchMode = useCallback(
    async (targetMode: "personal" | "merchant") => {
      setLocalMode(targetMode);
      if (typeof window !== "undefined") {
        localStorage.setItem("recover_active_mode", targetMode);
      }
      if (walletAddress) {
        try {
          await fetch("/api/profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-owner-address": walletAddress,
            },
            body: JSON.stringify({
              walletAddress,
              activeMode: targetMode,
            }),
          });
          queryClient.invalidateQueries({ queryKey: ["profile", walletAddress] });
        } catch (e) {
          console.error("Failed to sync activeMode with server:", e);
        }
      }
    },
    [walletAddress, queryClient]
  );

  const apiKey = profileData && !("isNotFound" in profileData) ? profileData.apiKey || null : null;
  const testApiKey = profileData && !("isNotFound" in profileData) ? profileData.testApiKey || null : null;
  const apiKeyMasked = profileData && !("isNotFound" in profileData) ? profileData.apiKeyMasked || (apiKey ? `${apiKey.substring(0, 13)}••••${apiKey.slice(-4)}` : null) : null;
  const testApiKeyMasked = profileData && !("isNotFound" in profileData) ? profileData.testApiKeyMasked || (testApiKey ? `${testApiKey.substring(0, 13)}••••${testApiKey.slice(-4)}` : null) : null;
  const webhookUrl = profileData && !("isNotFound" in profileData) ? profileData.webhookUrl || null : null;

  const contextValue = useMemo(
    () => ({
      fullName,
      companyName,
      businessLogo,
      businessPhone,
      businessEmail,
      username,
      phone,
      whatsapp,
      email,
      subscriptionActive,
      role,
      activeMode,
      hasPersonalProfile,
      hasMerchantProfile,
      switchMode,
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
      businessLogo,
      businessPhone,
      businessEmail,
      username,
      phone,
      whatsapp,
      email,
      subscriptionActive,
      role,
      activeMode,
      hasPersonalProfile,
      hasMerchantProfile,
      switchMode,
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
