"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Tag,
  Receipt,
  Package,
  Users,
  LayoutDashboard,
  PlusCircle,
  Store,
  Settings,
  Compass,
  KeyRound,
} from "lucide-react";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useProfile } from "@/context/ProfileContext";
import { useTeam } from "@/context/TeamContext";
import MobileExploreDrawer from "./MobileExploreDrawer";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { account } = useAuthReady();
  const { activeMode } = useProfile();
  const { isStaffMode, workspaceSession } = useTeam();
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>("receipts");

  // Sync active tab reactively with URL and custom workspace events
  useEffect(() => {
    const syncTab = () => {
      if (typeof window !== "undefined") {
        const tab = new URLSearchParams(window.location.search).get("tab") || "receipts";
        setCurrentTab(tab);
      }
    };
    syncTab();

    const handleCustomTab = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setCurrentTab(customEvent.detail);
      } else {
        syncTab();
      }
    };

    window.addEventListener("popstate", syncTab);
    window.addEventListener("workspace-tab-change", handleCustomTab);
    return () => {
      window.removeEventListener("popstate", syncTab);
      window.removeEventListener("workspace-tab-change", handleCustomTab);
    };
  }, [pathname]);

  const handleTabClick = (href: string) => {
    if (href.includes("?tab=")) {
      const tab = href.split("?tab=")[1];
      setCurrentTab(tab);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("workspace-tab-change", { detail: tab }));
      }
    }
  };

  // Do not show bottom nav on physical QR scan verification pages or public receipts
  if (pathname.startsWith("/verify") || pathname.startsWith("/scan") || pathname.startsWith("/r/")) {
    return null;
  }

  const isTabActive = (href: string) => {
    if (href.includes("?")) {
      const [path, query] = href.split("?");
      if (pathname !== path) return false;
      const params = new URLSearchParams(query);
      const expectedTab = params.get("tab");
      return expectedTab === currentTab;
    }
    return pathname === href;
  };

  return (
    <>
      <div className="h-20 md:hidden pointer-events-none" aria-hidden="true" />
      <nav
        aria-label="Mobile Navigation Bar"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-neutral-white/95 backdrop-blur-md border-t border-neutral-mist shadow-lg pb-safe"
      >
        <div className="flex items-center justify-around h-15 px-1.5 max-w-md mx-auto">
          {/* Mode 1: Staff PIN Session Mode */}
          {isStaffMode && workspaceSession ? (
            <>
              <Link
                href="/workspace?tab=pos"
                onClick={() => handleTabClick("/workspace?tab=pos")}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                  isTabActive("/workspace?tab=pos")
                    ? "text-blue-600 font-bold"
                    : "text-neutral-slate hover:text-primary"
                }`}
              >
                <Store
                  className={`w-5 h-5 ${
                    isTabActive("/workspace?tab=pos") ? "text-blue-600" : ""
                  }`}
                />
                <span className="text-[10px] mt-0.5 tracking-tight font-medium">POS</span>
              </Link>

              <Link
                href="/workspace?tab=receipts"
                onClick={() => handleTabClick("/workspace?tab=receipts")}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                  isTabActive("/workspace?tab=receipts")
                    ? "text-blue-600 font-bold"
                    : "text-neutral-slate hover:text-primary"
                }`}
              >
                <Receipt
                  className={`w-5 h-5 ${
                    isTabActive("/workspace?tab=receipts") ? "text-blue-600" : ""
                  }`}
                />
                <span className="text-[10px] mt-0.5 tracking-tight font-medium">Sales</span>
              </Link>

              <Link
                href="/workspace?tab=shipments"
                onClick={() => handleTabClick("/workspace?tab=shipments")}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                  isTabActive("/workspace?tab=shipments")
                    ? "text-blue-600 font-bold"
                    : "text-neutral-slate hover:text-primary"
                }`}
              >
                <Package
                  className={`w-5 h-5 ${
                    isTabActive("/workspace?tab=shipments") ? "text-blue-600" : ""
                  }`}
                />
                <span className="text-[10px] mt-0.5 tracking-tight font-medium">Shipments</span>
              </Link>

              {workspaceSession.role === "manager" && (
                <Link
                  href="/workspace?tab=team"
                  onClick={() => handleTabClick("/workspace?tab=team")}
                  className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                    isTabActive("/workspace?tab=team")
                      ? "text-blue-600 font-bold"
                      : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  <Users
                    className={`w-5 h-5 ${
                      isTabActive("/workspace?tab=team") ? "text-blue-600" : ""
                    }`}
                  />
                  <span className="text-[10px] mt-0.5 tracking-tight font-medium">Team</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => setIsExploreOpen(true)}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
                  isExploreOpen ? "text-blue-600 font-bold" : "text-neutral-slate hover:text-primary"
                }`}
                aria-label="Explore platform"
              >
                <Compass className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 tracking-tight font-medium">Explore</span>
              </button>
            </>
          ) : account ? (
            activeMode === "merchant" ? (
              /* Mode 2: Merchant Owner Navigation Tabs */
              <>
                <Link
                  href="/workspace?tab=pos"
                  onClick={() => handleTabClick("/workspace?tab=pos")}
                  className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                    isTabActive("/workspace?tab=pos")
                      ? "text-blue-600 font-bold"
                      : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  <Store
                    className={`w-5 h-5 ${
                      isTabActive("/workspace?tab=pos") ? "text-blue-600" : ""
                    }`}
                  />
                  <span className="text-[10px] mt-0.5 tracking-tight font-medium">POS</span>
                </Link>

                <Link
                  href="/workspace?tab=receipts"
                  onClick={() => handleTabClick("/workspace?tab=receipts")}
                  className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                    isTabActive("/workspace?tab=receipts")
                      ? "text-blue-600 font-bold"
                      : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  <Receipt
                    className={`w-5 h-5 ${
                      isTabActive("/workspace?tab=receipts") ? "text-blue-600" : ""
                    }`}
                  />
                  <span className="text-[10px] mt-0.5 tracking-tight font-medium">Sales</span>
                </Link>

                <Link
                  href="/workspace?tab=shipments"
                  onClick={() => handleTabClick("/workspace?tab=shipments")}
                  className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                    isTabActive("/workspace?tab=shipments")
                      ? "text-blue-600 font-bold"
                      : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  <Package
                    className={`w-5 h-5 ${
                      isTabActive("/workspace?tab=shipments") ? "text-blue-600" : ""
                    }`}
                  />
                  <span className="text-[10px] mt-0.5 tracking-tight font-medium">Shipments</span>
                </Link>

                <Link
                  href="/workspace?tab=team"
                  onClick={() => handleTabClick("/workspace?tab=team")}
                  className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                    isTabActive("/workspace?tab=team")
                      ? "text-blue-600 font-bold"
                      : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  <Users
                    className={`w-5 h-5 ${
                      isTabActive("/workspace?tab=team") ? "text-blue-600" : ""
                    }`}
                  />
                  <span className="text-[10px] mt-0.5 tracking-tight font-medium">Team</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsExploreOpen(true)}
                  className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
                    isExploreOpen ? "text-blue-600 font-bold" : "text-neutral-slate hover:text-primary"
                  }`}
                  aria-label="Explore platform"
                >
                  <Compass className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5 tracking-tight font-medium">Explore</span>
                </button>
              </>
            ) : (
              /* Mode 3: Consumer Account Bottom Navigation Tabs */
              <>
                <Link
                  href="/dashboard"
                  className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                    isTabActive("/dashboard")
                      ? "text-blue-600 font-bold"
                      : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  <LayoutDashboard className={`w-5 h-5 ${isTabActive("/dashboard") ? "text-blue-600" : ""}`} />
                  <span className="text-[10px] mt-0.5 tracking-tight font-medium">Items</span>
                </Link>

                {/* Elevated Center CTA: Register Item */}
                <Link
                  href="/register"
                  className="flex flex-col items-center justify-center -mt-4 group cursor-pointer"
                  aria-label="Register New Item"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-transform group-active:scale-95 ${
                      isTabActive("/register")
                        ? "bg-accent text-white ring-4 ring-accent/20"
                        : "bg-primary text-white hover:bg-primary-light"
                    }`}
                  >
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-[10px] mt-1 font-semibold ${
                      isTabActive("/register") ? "text-accent font-bold" : "text-neutral-slate"
                    }`}
                  >
                    Register
                  </span>
                </Link>

                <Link
                  href="/settings"
                  className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                    isTabActive("/settings")
                      ? "text-blue-600 font-bold"
                      : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  <Settings className={`w-5 h-5 ${isTabActive("/settings") ? "text-blue-600" : ""}`} />
                  <span className="text-[10px] mt-0.5 tracking-tight font-medium">Settings</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsExploreOpen(true)}
                  className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
                    isExploreOpen ? "text-blue-600 font-bold" : "text-neutral-slate hover:text-primary"
                  }`}
                  aria-label="Explore platform"
                >
                  <Compass className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5 tracking-tight font-medium">Explore</span>
                </button>
              </>
            )
          ) : (
            /* Mode 4: Guest / Unauthenticated Bottom Navigation Tabs */
            <>
              <Link
                href="/"
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                  isTabActive("/") ? "text-blue-600 font-bold" : "text-neutral-slate hover:text-primary"
                }`}
              >
                <Home className={`w-5 h-5 ${isTabActive("/") ? "text-accent" : ""}`} />
                <span className="text-[10px] mt-0.5 tracking-tight font-medium">Home</span>
              </Link>

              <Link
                href="/pricing"
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                  isTabActive("/pricing") ? "text-blue-600 font-bold" : "text-neutral-slate hover:text-primary"
                }`}
              >
                <Tag className={`w-5 h-5 ${isTabActive("/pricing") ? "text-emerald-600" : ""}`} />
                <span className="text-[10px] mt-0.5 tracking-tight font-medium">Pricing</span>
              </Link>

              <Link
                href="/workspace/login"
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                  isTabActive("/workspace/login") ? "text-blue-600 font-bold" : "text-neutral-slate hover:text-primary"
                }`}
              >
                <KeyRound className={`w-5 h-5 ${isTabActive("/workspace/login") ? "text-blue-600" : ""}`} />
                <span className="text-[10px] mt-0.5 tracking-tight font-medium">Staff PIN</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsExploreOpen(true)}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
                  isExploreOpen ? "text-blue-600 font-bold" : "text-neutral-slate hover:text-primary"
                }`}
                aria-label="Explore platform"
              >
                <Compass className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 tracking-tight font-medium">Explore</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Global Mobile Explore Drawer */}
      <MobileExploreDrawer
        isOpen={isExploreOpen}
        onClose={() => setIsExploreOpen(false)}
      />
    </>
  );
}
