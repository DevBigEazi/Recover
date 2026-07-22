"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ProfileContextType {
  fullName: string | null;
  username: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
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
    error,
  } = useQuery({
    queryKey: ["profile", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const res = await fetch(`/api/profile?walletAddress=${walletAddress}`);
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
    staleTime: 1000 * 60 * 5,
  });

  const isProfileLoaded = !isLoading;
  const isNewUser = !!walletAddress && isProfileLoaded && profileData && "isNotFound" in profileData && profileData.isNotFound;

  console.log("ProfileProvider state:", {
    walletAddress,
    isLoading,
    isError,
    error: error?.message,
    profileData,
    isNewUser,
    isOpenSetup,
  });

  // Auto-open modal if the user is logged in but doesn't have a profile yet
  useEffect(() => {
    if (isNewUser) {
      setIsOpenSetup(true);
    } else {
      setIsOpenSetup(false);
    }
  }, [isNewUser]);

  const openProfileSetup = () => setIsOpenSetup(true);
  const closeProfileSetup = () => setIsOpenSetup(false);

  const refetchProfile = () => {
    if (walletAddress) {
      queryClient.invalidateQueries({ queryKey: ["profile", walletAddress] });
    }
  };

  const fullName = profileData && !("isNotFound" in profileData) ? profileData.fullName : null;
  const username = profileData && !("isNotFound" in profileData) ? profileData.username : null;
  const phone = profileData && !("isNotFound" in profileData) ? profileData.phone || null : null;
  const whatsapp = profileData && !("isNotFound" in profileData) ? profileData.whatsapp || null : null;
  const email = profileData && !("isNotFound" in profileData) ? profileData.email || null : null;

  return (
    <ProfileContext.Provider
      value={{
        fullName,
        username,
        phone,
        whatsapp,
        email,
        isProfileLoaded,
        isNewUser,
        isOpenSetup,
        isError,
        openProfileSetup,
        closeProfileSetup,
        refetchProfile,
      }}
    >
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
