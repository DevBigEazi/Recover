"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  X,
  Home,
  Tag,
  Code,
  Info,
  LogOut,
  User as UserIcon,
  ChevronRight,
} from "lucide-react";
import { useActiveWallet, useDisconnect } from "thirdweb/react";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";

interface MobileExploreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileExploreDrawer({
  isOpen,
  onClose,
}: MobileExploreDrawerProps) {
  const pathname = usePathname();
  const { account, isAuthLoading } = useAuthReady();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const { openLogin } = useAuth();
  const { fullName, companyName, username, role, plan } = useProfile();

  if (!isOpen) return null;

  const isActive = (href: string) => pathname === href;

  const handleSignOut = () => {
    if (activeWallet) {
      disconnect(activeWallet);
    }
    onClose();
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
            <Link href="/" onClick={onClose} className="flex items-center">
              <Image
                src="/logo-full.svg"
                alt="Recover Logo"
                width={120}
                height={35}
                className="h-8 w-auto"
              />
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

          {/* User Profile Card (if logged in) */}
          {account && (
            <div className="bg-neutral-mist/50 border border-neutral-mist rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {role === "merchant" ? "🏢" : <UserIcon className="w-4 h-4 text-primary" />}
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
          )}

          {/* Section 1: Explore & Informational Pages */}
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
                  <Info className="w-4 h-4 text-amber-600" />
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
          ) : !account ? (
            <button
              type="button"
              onClick={handleSignIn}
              className="w-full bg-primary hover:bg-primary-light text-neutral-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors text-center cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In / Connect</span>
            </button>
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
