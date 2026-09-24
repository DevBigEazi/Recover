"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  X,
  Home,
  Tag,
  Code,
  Info,
  LogOut,
  User as UserIcon,
  ChevronRight,
  KeyRound,
} from "lucide-react";
import { useActiveWallet, useDisconnect } from "thirdweb/react";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useTeam } from "@/context/TeamContext";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface MobileExploreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileExploreDrawer({
  isOpen,
  onClose,
}: MobileExploreDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { account, isAuthLoading } = useAuthReady();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const { openLogin } = useAuth();
  const { fullName, companyName, businessLogo, username, role, plan } = useProfile();
  const { isStaffMode, workspaceSession } = useTeam();

  const isExplorePage =
    ["/", "/pricing", "/developers", "/about"].includes(pathname) ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/scan");

  // Keep platform logo permanent on Home, Explore, and public scan/verify pages
  const activeLogo = isExplorePage
    ? null
    : isStaffMode
    ? workspaceSession?.businessLogo || businessLogo
    : businessLogo;

  const brandTitle = isStaffMode
    ? (workspaceSession?.merchantName || companyName || "Workspace")
    : (companyName || fullName || username || "Recover");

  if (!isOpen) return null;

  const isActive = (href: string) => {
    if (href.includes("?")) {
      const [path, query] = href.split("?");
      if (pathname !== path) return false;
      const params = new URLSearchParams(query);
      const expectedTab = params.get("tab");
      const currentTab =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("tab") || "receipts"
          : "receipts";
      return expectedTab === currentTab;
    }
    return pathname === href;
  };

  const handleSignOut = () => {
    if (activeWallet) {
      disconnect(activeWallet);
    }
    onClose();
  };

  const handleWorkspaceLogout = async () => {
    try {
      await fetch("/api/workspace/logout", { method: "POST" });
      if (typeof window !== "undefined") {
        localStorage.removeItem("workspace_token");
      }
      queryClient.invalidateQueries({ queryKey: ["workspace-session"] });
      queryClient.removeQueries({ queryKey: ["workspace-session"] });
      queryClient.clear();
      onClose();
      toast.success("Signed out of workspace.");
      router.push("/workspace/login");
    } catch {
      toast.error("Could not sign out.");
    }
  };

  const handleSignIn = () => {
    onClose();
    openLogin();
  };

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-neutral-slate/60 backdrop-blur-xs z-50 transition-opacity duration-300 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Drawer */}
      <aside
        className="fixed top-0 right-0 bottom-0 w-[85%] max-w-xs bg-neutral-white shadow-2xl z-50 flex flex-col justify-between p-5 transition-transform duration-300 ease-in-out md:hidden overflow-y-auto border-l border-neutral-mist pb-safe"
        role="dialog"
        aria-modal="true"
        aria-label="Explore and Navigation Menu"
      >
        <div className="space-y-5">
          {/* Top Bar: Logo & Close Button */}
          <div className="flex items-center justify-between border-b border-neutral-mist pb-3">
            <Link
              href={isExplorePage ? "/" : role === "merchant" ? "/workspace" : account ? "/dashboard" : "/"}
              onClick={onClose}
              className="flex items-center space-x-2 min-w-0"
            >
              {activeLogo ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full border border-neutral-mist bg-neutral-white overflow-hidden flex items-center justify-center shadow-xs shrink-0 p-0.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeLogo}
                      alt={brandTitle}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <span className="font-display font-bold text-sm text-primary tracking-tight truncate max-w-40">
                    {brandTitle}
                  </span>
                </div>
              ) : (
                <Image
                  src="/logo-full.svg"
                  alt="Recover Logo"
                  width={120}
                  height={35}
                  className="h-8 w-auto"
                />
              )}
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-slate hover:text-primary hover:bg-neutral-mist rounded-xl transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Card */}
          {isStaffMode && workspaceSession ? (
            <div className="bg-neutral-mist/50 border border-neutral-mist rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                  {workspaceSession.memberName.slice(0, 1).toUpperCase()}
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="text-xs font-bold text-primary truncate">
                    {workspaceSession.memberName}
                  </div>
                  <div className="text-[10px] text-neutral-slate truncate">
                    {workspaceSession.branchName ? `📍 ${workspaceSession.branchName}` : workspaceSession.memberEmail}
                  </div>
                  {workspaceSession.merchantName && (
                    <div className="text-[9px] text-blue-700 font-semibold truncate">
                      🏢 {workspaceSession.merchantName}
                    </div>
                  )}
                </div>
              </div>
              <span
                className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase shrink-0 ${
                  workspaceSession.role === "manager"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {workspaceSession.role === "manager" ? "Manager" : "Sales"}
              </span>
            </div>
          ) : account ? (
            <div className="bg-neutral-mist/50 border border-neutral-mist rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden">
                  {role === "merchant" && businessLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={businessLogo} alt="" className="w-full h-full object-contain" />
                  ) : (
                    role === "merchant" ? "🏪" : <UserIcon className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="text-xs font-bold text-primary truncate">
                    {role === "merchant"
                      ? companyName || fullName || username || "Merchant"
                      : fullName || username || "Owner"}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-slate truncate">
                    {account.address.slice(0, 6)}...{account.address.slice(-4)}
                  </div>
                </div>
              </div>
              {role === "merchant" && (
                <span className="bg-indigo-100 text-indigo-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase shrink-0">
                  {plan === "free" ? "Free" : "Pro"}
                </span>
              )}
            </div>
          ) : null}

          {/* Section: Explore & Informational Pages */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-slate/80 px-2 block">
              Explore Recover
            </span>

            <nav className="space-y-1">
              <Link
                href="/"
                onClick={onClose}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
                  isActive("/")
                    ? "text-primary bg-neutral-mist font-bold"
                    : "text-neutral-slate hover:text-primary hover:bg-neutral-mist/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Home className="w-4 h-4 text-accent" />
                  <span>Home</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-slate/40" />
              </Link>

              <Link
                href="/pricing"
                onClick={onClose}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
                  isActive("/pricing")
                    ? "text-primary bg-neutral-mist font-bold"
                    : "text-neutral-slate hover:text-primary hover:bg-neutral-mist/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <span>Pricing &amp; Quotas</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-slate/40" />
              </Link>

              <Link
                href="/developers"
                onClick={onClose}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
                  isActive("/developers")
                    ? "text-primary bg-neutral-mist font-bold"
                    : "text-neutral-slate hover:text-primary hover:bg-neutral-mist/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Code className="w-4 h-4 text-indigo-600" />
                  <span>Developer REST API</span>
                </div>
                <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.2 rounded border border-indigo-200">
                  Docs
                </span>
              </Link>

              <Link
                href="/about"
                onClick={onClose}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
                  isActive("/about")
                    ? "text-primary bg-neutral-mist font-bold"
                    : "text-neutral-slate hover:text-primary hover:bg-neutral-mist/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span>About Recover</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-slate/40" />
              </Link>
            </nav>
          </div>
        </div>

        {/* Drawer Bottom Session Action */}
        <div className="border-t border-neutral-mist pt-4 mt-6">
          {isAuthLoading ? (
            <div className="w-full h-10 bg-neutral-mist animate-pulse rounded-xl" />
          ) : isStaffMode && workspaceSession ? (
            <button
              type="button"
              onClick={handleWorkspaceLogout}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-red-100"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Workspace</span>
            </button>
          ) : !account ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSignIn}
                className="w-full bg-primary hover:bg-primary-light text-neutral-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors text-center cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                <UserIcon className="w-4 h-4" />
                <span>Sign In / Connect</span>
              </button>
              <Link
                href="/workspace/login"
                onClick={onClose}
                className="w-full bg-neutral-mist hover:bg-neutral-mist/80 text-primary font-semibold py-2 px-4 rounded-xl text-xs transition-colors text-center flex items-center justify-center gap-2 border border-neutral-mist"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                <span>Staff Workspace PIN</span>
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-red-100"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
