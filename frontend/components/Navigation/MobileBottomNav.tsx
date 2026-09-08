"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Tag,
  Code,
  LayoutDashboard,
  PlusCircle,
  Truck,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useProfile } from "@/context/ProfileContext";
import MobileExploreDrawer from "./MobileExploreDrawer";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { account } = useAuthReady();
  const { role } = useProfile();
  const [isExploreOpen, setIsExploreOpen] = useState(false);

  // Do not show bottom nav on physical QR scan verification pages
  if (pathname.startsWith("/verify") || pathname.startsWith("/scan")) {
    return null;
  }

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <nav
        aria-label="Mobile Navigation Bar"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-neutral-white/95 backdrop-blur-md border-t border-neutral-mist shadow-lg pb-safe"
      >
        <div className="flex items-center justify-around h-15 px-2 max-w-md mx-auto">
          {account ? (
            role === "merchant" ? (
              /* Merchant Bottom Navigation Tabs */
              <>
                <Link
                  href="/shipments"
                  className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                    isActive("/shipments")
                      ? "text-primary font-bold"
                      : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  <Truck className={`w-5 h-5 ${isActive("/shipments") ? "text-indigo-600" : ""}`} />
                  <span className="text-[10px] mt-0.5 tracking-tight">Shipments</span>
                </Link>

                <Link
                  href="/settings"
                  className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                    isActive("/settings")
                      ? "text-primary font-bold"
                      : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  <Settings className={`w-5 h-5 ${isActive("/settings") ? "text-indigo-600" : ""}`} />
                  <span className="text-[10px] mt-0.5 tracking-tight">Settings</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsExploreOpen(true)}
                  className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
                    isExploreOpen ? "text-primary font-bold" : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  <MoreHorizontal className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5 tracking-tight">More</span>
                </button>
              </>
            ) : (
              /* Standard User Bottom Navigation Tabs */
              <>
                <Link
                  href="/dashboard"
                  className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                    isActive("/dashboard")
                      ? "text-primary font-bold"
                      : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  <LayoutDashboard className={`w-5 h-5 ${isActive("/dashboard") ? "text-primary" : ""}`} />
                  <span className="text-[10px] mt-0.5 tracking-tight">Items</span>
                </Link>

                {/* Elevated Center CTA: Register Item */}
                <Link
                  href="/register"
                  className="flex flex-col items-center justify-center -mt-4 group cursor-pointer"
                  aria-label="Register New Item"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-transform group-active:scale-95 ${
                      isActive("/register")
                        ? "bg-accent text-white ring-4 ring-accent/20"
                        : "bg-primary text-white hover:bg-primary-light"
                    }`}
                  >
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-[10px] mt-1 font-semibold ${
                      isActive("/register") ? "text-accent font-bold" : "text-neutral-slate"
                    }`}
                  >
                    Register
                  </span>
                </Link>

                <Link
                  href="/settings"
                  className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                    isActive("/settings")
                      ? "text-primary font-bold"
                      : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  <Settings className={`w-5 h-5 ${isActive("/settings") ? "text-primary" : ""}`} />
                  <span className="text-[10px] mt-0.5 tracking-tight">Settings</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsExploreOpen(true)}
                  className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
                    isExploreOpen ? "text-primary font-bold" : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  <MoreHorizontal className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5 tracking-tight">More</span>
                </button>
              </>
            )
          ) : (
            /* Guest / Unauthenticated Bottom Navigation Tabs */
            <>
              <Link
                href="/"
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                  isActive("/") ? "text-primary font-bold" : "text-neutral-slate hover:text-primary"
                }`}
              >
                <Home className={`w-5 h-5 ${isActive("/") ? "text-accent" : ""}`} />
                <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
              </Link>

              <Link
                href="/pricing"
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                  isActive("/pricing") ? "text-primary font-bold" : "text-neutral-slate hover:text-primary"
                }`}
              >
                <Tag className={`w-5 h-5 ${isActive("/pricing") ? "text-emerald-600" : ""}`} />
                <span className="text-[10px] mt-0.5 tracking-tight">Pricing</span>
              </Link>

              <Link
                href="/developers"
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                  isActive("/developers") ? "text-primary font-bold" : "text-neutral-slate hover:text-primary"
                }`}
              >
                <Code className={`w-5 h-5 ${isActive("/developers") ? "text-indigo-600" : ""}`} />
                <span className="text-[10px] mt-0.5 tracking-tight">API</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsExploreOpen(true)}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
                  isExploreOpen ? "text-primary font-bold" : "text-neutral-slate hover:text-primary"
                }`}
              >
                <MoreHorizontal className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 tracking-tight">More</span>
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
