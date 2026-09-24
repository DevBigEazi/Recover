"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Bell, Settings } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useActiveWallet, useDisconnect } from "thirdweb/react";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useTeam } from "@/context/TeamContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const STAFF_MENU_ITEMS = [
  { label: "POS Terminal", href: "/workspace?tab=pos" },
  { label: "Sales & Receipts", href: "/workspace?tab=receipts" },
  { label: "Package Shipments", href: "/workspace?tab=shipments" },
  { label: "Branch Team Management", href: "/workspace?tab=team", managerOnly: true },
];

const PLAN_LABELS: Record<string, string> = {
  pro_lite: "Pro Lite",
  pro_starter: "Pro Starter",
  pro_growth: "Pro Growth",
  pro_scale: "Pro Scale",
  pro: "Pro Tier",
};

export default function Header() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isExploreMenuOpen, setIsExploreMenuOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>("receipts");
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { account, isAuthLoading } = useAuthReady();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const { openLogin } = useAuth();
  const {
    fullName,
    companyName,
    businessLogo,
    username,
    plan,
    billingCycle,
    activeMode,
    hasPersonalProfile,
    hasMerchantProfile,
    switchMode,
  } = useProfile();
  const { isStaffMode, workspaceSession } = useTeam();

  // Reactive tab state synchronization across Header, MobileBottomNav, and WorkspaceContent
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

  // Dismiss any open dropdowns when clicking anywhere randomly on the screen
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !target.closest("[data-dropdown-container]")) {
        setIsUserMenuOpen(false);
        setIsNotificationsOpen(false);
        setIsExploreMenuOpen(false);
      }
    };

    if (isUserMenuOpen || isNotificationsOpen || isExploreMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isUserMenuOpen, isNotificationsOpen, isExploreMenuOpen]);

  // 1. Fetch notifications via TanStack Query (polls every 5s for real-time alerts)
  const { data: notifications = [] } = useQuery<Array<{
    id: string;
    type: string;
    message: string;
    read: boolean;
    createdAt: string;
    registrationId: string;
  }>>({
    queryKey: ["notifications", account?.address],
    queryFn: async () => {
      if (!account) return [];
      const res = await fetch("/api/notifications", {
        headers: { "x-owner-address": account.address },
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: !!account?.address,
  });

  // 2. Mutation to mark all notifications as read
  const markReadMutation = useMutation({
    mutationFn: async () => {
      if (!account) return;
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "x-owner-address": account.address },
      });
      if (!res.ok) throw new Error("Failed to mark notifications read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", account?.address] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Role & Mode tailored navigation links
  const navLinks: { name: string; href: string }[] = isStaffMode && workspaceSession
    ? workspaceSession.role === "manager"
      ? [
          { name: "POS Terminal", href: "/workspace?tab=pos" },
          { name: "Sales & Receipts", href: "/workspace?tab=receipts" },
          { name: "Shipments", href: "/workspace?tab=shipments" },
          { name: "Team & Staff", href: "/workspace?tab=team" },
        ]
      : [
          { name: "POS Terminal", href: "/workspace?tab=pos" },
          { name: "Sales & Receipts", href: "/workspace?tab=receipts" },
          { name: "Shipments", href: "/workspace?tab=shipments" },
        ]
    : activeMode === "merchant"
    ? [
        { name: "POS Terminal", href: "/workspace?tab=pos" },
        { name: "Sales & Receipts", href: "/workspace?tab=receipts" },
        { name: "Shipments", href: "/workspace?tab=shipments" },
        { name: "Team & Staff", href: "/workspace?tab=team" },
      ]
    : account
    ? [
        { name: "Items Dashboard", href: "/dashboard" },
        { name: "Register Item", href: "/register" },
      ]
    : [
        { name: "Home", href: "/" },
        { name: "Pricing", href: "/pricing" },
        { name: "Developers", href: "/developers" },
        { name: "About", href: "/about" },
      ];

  const isExploreActive = ["/", "/pricing", "/developers", "/about"].includes(pathname);

  const isActive = (href: string) => {
    if (href.includes("?")) {
      const [path, query] = href.split("?");
      if (pathname !== path) return false;
      const params = new URLSearchParams(query);
      const expectedTab = params.get("tab");
      return expectedTab === currentTab;
    }
    if (
      href === "/workspace" &&
      (pathname.startsWith("/workspace") || pathname.startsWith("/receipts") || pathname.startsWith("/shipments"))
    ) {
      return true;
    }
    return pathname === href;
  };

  const handleDisconnect = () => {
    if (activeWallet) {
      disconnect(activeWallet);
    }
    setIsUserMenuOpen(false);
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
      setIsUserMenuOpen(false);
      toast.success("Signed out of workspace.");
      router.push("/workspace/login");
    } catch {
      toast.error("Could not sign out.");
    }
  };

  const isExplorePage =
    ["/", "/pricing", "/developers", "/about"].includes(pathname) ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/scan");

  // Keep platform logo permanent on Home, Explore, and public scan/verify pages
  const activeLogo = isExplorePage
    ? null
    : isStaffMode
    ? workspaceSession?.businessLogo || businessLogo
    : activeMode === "merchant"
    ? businessLogo
    : null;

  const brandTitle = isStaffMode
    ? (workspaceSession?.merchantName || companyName || "Workspace")
    : activeMode === "merchant"
    ? (companyName || fullName || username || "Recover")
    : "Recover";

  return (
    <header className="bg-neutral-white border-b border-neutral-mist sticky top-0 z-50 shadow-xs w-full max-w-full overflow-x-clip">
      {/* Click-outside backdrop to dismiss any open dropdowns */}
      {(isUserMenuOpen || isNotificationsOpen || isExploreMenuOpen) && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => {
            setIsUserMenuOpen(false);
            setIsNotificationsOpen(false);
            setIsExploreMenuOpen(false);
          }}
          aria-hidden="true"
        />
      )}

      <nav className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 relative z-50 w-full">
        <div className="flex h-16 items-center justify-between gap-1 sm:gap-2 lg:gap-4 min-w-0">
          
          {/* Logo / Wordmark lockup */}
          <div className="flex items-center shrink-0">
            <Link
              href={isExplorePage ? "/" : activeMode === "merchant" ? "/workspace" : account ? "/dashboard" : "/"}
              className="flex items-center space-x-2 sm:space-x-2.5 group shrink-0"
            >
              {activeLogo ? (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-neutral-mist bg-neutral-white overflow-hidden flex items-center justify-center shadow-xs shrink-0 p-0.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeLogo}
                      alt={brandTitle}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <span className="font-display font-bold text-sm lg:text-base text-primary tracking-tight truncate whitespace-nowrap hidden lg:inline-block max-w-40 xl:max-w-56 group-hover:text-blue-600 transition-colors">
                    {brandTitle}
                  </span>
                </div>
              ) : (
                <>
                  <Image 
                    src="/logo-icon.svg" 
                    alt="Recover Logo" 
                    width={36} 
                    height={36} 
                    className="h-8 sm:h-9 w-auto shrink-0 lg:hidden" 
                    loading="eager"
                  />
                  <Image 
                    src="/logo-full.svg" 
                    alt="Recover Logo" 
                    width={137} 
                    height={40} 
                    className="h-9 sm:h-10 w-auto shrink-0 hidden lg:block" 
                    loading="eager"
                  />
                </>
              )}
            </Link>
          </div>

          {/* Desktop Navigation (md+) */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2 xl:space-x-4">
            {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => {
                    if (link.href.includes("?tab=")) {
                      const tab = new URLSearchParams(link.href.split("?")[1]).get("tab") || "receipts";
                      setCurrentTab(tab);
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("workspace-tab-change", { detail: tab }));
                      }
                    }
                  }}
                  className={`px-1.5 lg:px-2.5 xl:px-3 py-1 lg:py-1.5 text-xs xl:text-sm font-medium transition-colors duration-200 rounded-md whitespace-nowrap shrink-0 ${
                    isActive(link.href)
                      ? "text-blue-600 font-bold bg-blue-50/80"
                      : "text-neutral-slate hover:text-primary hover:bg-neutral-mist"
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              {/* Explore ▾ Menu for Logged In Users to access informational pages */}
              {(isStaffMode || !!account) && (
                <div className="relative" data-dropdown-container>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExploreMenuOpen(!isExploreMenuOpen);
                      setIsUserMenuOpen(false);
                      setIsNotificationsOpen(false);
                    }}
                    className={`flex items-center gap-1 px-1.5 lg:px-2.5 xl:px-3 py-1 lg:py-1.5 text-xs xl:text-sm font-medium transition-colors duration-200 rounded-md cursor-pointer whitespace-nowrap shrink-0 ${
                      isExploreActive || isExploreMenuOpen
                        ? "text-blue-600 font-bold bg-blue-50/80"
                        : "text-neutral-slate hover:text-primary hover:bg-neutral-mist"
                    }`}
                  >
                    <span>Explore</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-neutral-slate transition-transform duration-200 ${
                        isExploreMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isExploreMenuOpen && (
                    <div className="absolute left-0 mt-2 w-52 bg-neutral-white border border-neutral-mist rounded-xl shadow-lg py-2 animate-fade-in z-50">
                      <div className="px-3.5 py-1.5 border-b border-neutral-mist mb-1">
                        <span className="text-[9px] font-extrabold uppercase text-neutral-slate tracking-wider block">
                          Recover Platform
                        </span>
                      </div>
                      <Link href="/" className="block px-3.5 py-2 text-xs text-neutral-slate hover:text-primary hover:bg-neutral-mist transition-colors" onClick={() => setIsExploreMenuOpen(false)}>Home</Link>
                      <Link href="/pricing" className="block px-3.5 py-2 text-xs text-neutral-slate hover:text-primary hover:bg-neutral-mist transition-colors" onClick={() => setIsExploreMenuOpen(false)}>Pricing &amp; Quotas</Link>
                      <Link href="/developers" className="block px-3.5 py-2 text-xs text-neutral-slate hover:text-primary hover:bg-neutral-mist transition-colors" onClick={() => setIsExploreMenuOpen(false)}>Developer REST API</Link>
                      <Link href="/about" className="block px-3.5 py-2 text-xs text-neutral-slate hover:text-primary hover:bg-neutral-mist transition-colors" onClick={() => setIsExploreMenuOpen(false)}>About Recover</Link>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Desktop Connect Wallet or Staff Profile */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0">
              {isAuthLoading ? (
                <div className="w-20 h-9 bg-neutral-mist animate-pulse rounded-lg" />
              ) : isStaffMode && workspaceSession ? (
                <div className="relative" data-dropdown-container>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(!isUserMenuOpen);
                      setIsNotificationsOpen(false);
                    }}
                    className="flex items-center space-x-2.5 bg-neutral-mist hover:bg-neutral-mist/80 border border-gray-300 text-primary font-medium rounded-lg px-3 py-1.5 text-sm transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {workspaceSession.memberName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-primary truncate max-w-30">
                          {workspaceSession.memberName}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                            workspaceSession.role === "manager"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {workspaceSession.role === "manager" ? "Manager" : "Sales Rep"}
                        </span>
                      </div>
                      {workspaceSession.branchName && (
                        <span className="text-[10px] text-neutral-slate truncate max-w-32.5">
                          📍 {workspaceSession.branchName}
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-neutral-slate transition-transform duration-200 ${
                        isUserMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-neutral-white border border-neutral-mist rounded-xl shadow-lg py-2 animate-fade-in z-50">
                      <div className="px-4 py-2.5 border-b border-neutral-mist mb-1 bg-neutral-mist/20">
                        <span className="text-[9px] font-extrabold uppercase text-neutral-slate tracking-wider block">
                          Workspace Staff
                        </span>
                        <p className="text-xs font-bold text-primary truncate">
                          {workspaceSession.memberName}
                        </p>
                        <p className="text-[11px] text-neutral-slate truncate">
                          {workspaceSession.memberEmail}
                        </p>
                        {workspaceSession.merchantName && (
                          <p className="text-[10px] text-blue-700 font-semibold mt-1 truncate">
                            🏢 {workspaceSession.merchantName}
                          </p>
                        )}
                      </div>

                      {STAFF_MENU_ITEMS.filter((item) => !item.managerOnly || workspaceSession.role === "manager").map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-4 py-2 text-xs text-neutral-slate hover:bg-neutral-mist transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ))}

                      <div className="border-t border-neutral-mist my-1.5" />

                      <button
                        type="button"
                        onClick={handleWorkspaceLogout}
                        className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer font-medium"
                      >
                        Sign Out of Workspace
                      </button>
                    </div>
                  )}
                </div>
              ) : !account ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openLogin}
                    className="bg-primary hover:bg-primary-light text-neutral-white font-medium rounded-lg px-4 py-2 text-sm transition-colors shadow-xs cursor-pointer"
                  >
                    Sign In
                  </button>
                  <Link
                    href="/workspace/login"
                    className="text-xs font-semibold text-neutral-slate hover:text-primary px-3 py-2 rounded-lg hover:bg-neutral-mist transition-colors"
                  >
                    Staff Workspace →
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {/* Notifications Dropdown */}
                  <div className="relative" data-dropdown-container>
                    <button
                      onClick={() => {
                        setIsNotificationsOpen(!isNotificationsOpen);
                        setIsUserMenuOpen(false);
                      }}
                      className="p-2 text-neutral-slate hover:text-primary hover:bg-neutral-mist rounded-lg transition-colors relative cursor-pointer"
                      aria-label="Notifications"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-critical rounded-full" />
                      )}
                    </button>

                    {isNotificationsOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-neutral-white border border-neutral-mist rounded-xl shadow-lg py-3 px-4 animate-fade-in z-50 space-y-3">
                        <div className="flex items-center justify-between border-b border-neutral-mist pb-2">
                          <span className="text-xs font-bold text-primary font-display">Notifications</span>
                          {unreadCount > 0 && (
                            <button
                              onClick={() => markReadMutation.mutate()}
                              className="text-[10px] text-accent font-semibold hover:underline cursor-pointer shrink-0 whitespace-nowrap"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>

                        {notifications.length === 0 ? (
                          <div className="py-6 text-center text-xs text-neutral-slate">
                            No notifications yet.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                            {notifications.map((n) => (
                              <div
                                key={n.id}
                                className={`text-[11px] leading-relaxed p-2.5 rounded-lg border transition-colors ${
                                  n.read
                                    ? "bg-neutral-white border-transparent text-neutral-slate"
                                    : "bg-neutral-mist/40 border-neutral-mist text-primary font-medium"
                                }`}
                              >
                                <div className="flex justify-between items-center text-[9px] text-neutral-slate mb-1">
                                  <span className="capitalize font-semibold text-accent">{n.type}</span>
                                  <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p>{n.message}</p>
                                {n.registrationId && (
                                  <Link
                                    href={`/items/${n.registrationId}`}
                                    className="text-[10px] text-accent font-semibold hover:underline block mt-1"
                                    onClick={() => setIsNotificationsOpen(false)}
                                  >
                                    View Item details →
                                  </Link>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* User Profile Menu */}
                  <div className="relative" data-dropdown-container>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(!isUserMenuOpen);
                        setIsNotificationsOpen(false);
                      }}
                      className="flex items-center space-x-1.5 sm:space-x-2 bg-neutral-mist hover:bg-neutral-mist/80 border border-gray-300 text-primary font-medium rounded-lg px-2 lg:px-3.5 py-1.5 text-xs sm:text-sm transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <div className="w-5 h-5 rounded-full bg-[#1e2a4a0a] flex items-center justify-center text-xs border border-gray-200 overflow-hidden shrink-0">
                        {activeMode === "merchant" && businessLogo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={businessLogo} alt="" className="w-full h-full object-contain" />
                        ) : (
                          activeMode === "merchant" ? "🏪" : "👤"
                        )}
                      </div>
                      <span className={`${(activeMode === "merchant" ? companyName : fullName) || username ? 'font-sans' : 'font-mono'} text-xs font-semibold truncate whitespace-nowrap hidden lg:inline-block max-w-36 xl:max-w-48`}>
                        {activeMode === "merchant"
                          ? (companyName || fullName || username || `${account.address.slice(0, 6)}...${account.address.slice(-4)}`)
                          : (fullName || username || `${account.address.slice(0, 6)}...${account.address.slice(-4)}`)}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-neutral-white border border-neutral-mist rounded-xl shadow-lg py-2 animate-fade-in z-50">
                        {activeMode === "merchant" ? (
                          <>
                            <div className="px-4 py-2 border-b border-neutral-mist mb-1 bg-neutral-mist/20">
                              <span className="text-[9px] font-extrabold uppercase text-neutral-slate tracking-wider block">Merchant Plan</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-bold text-primary">
                                  {(plan && PLAN_LABELS[plan]) || "Free Tier"}
                                </span>
                                <span className="bg-blue-100 text-blue-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                                  {billingCycle === "yearly" ? "Annual" : "Monthly"}
                                </span>
                              </div>
                            </div>
                            <Link href="/workspace" className="block px-4 py-2 text-xs text-neutral-slate hover:bg-neutral-mist transition-colors" onClick={() => setIsUserMenuOpen(false)}>Merchant Workspace</Link>
                            <Link href="/settings" className="block px-4 py-2 text-xs text-neutral-slate hover:bg-neutral-mist transition-colors" onClick={() => setIsUserMenuOpen(false)}>Merchant Settings</Link>
                          </>
                        ) : (
                          <>
                            <Link href="/dashboard" className="block px-4 py-2 text-xs text-neutral-slate hover:bg-neutral-mist transition-colors" onClick={() => setIsUserMenuOpen(false)}>Dashboard</Link>
                            <Link href="/register" className="block px-4 py-2 text-xs text-neutral-slate hover:bg-neutral-mist transition-colors" onClick={() => setIsUserMenuOpen(false)}>Register Item</Link>
                            <Link href="/settings" className="block px-4 py-2 text-xs text-neutral-slate hover:bg-neutral-mist transition-colors" onClick={() => setIsUserMenuOpen(false)}>Settings</Link>
                          </>
                        )}
                        <div className="border-t border-neutral-mist my-1.5" />
                      <button
                        onClick={handleDisconnect}
                        className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>

          {/* Mobile header action: Notifications, Staff Controls, or Sign In */}
          <div className="flex items-center md:hidden gap-1.5">
            {isStaffMode && workspaceSession ? (
              <div className="relative" data-dropdown-container>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(!isUserMenuOpen);
                    setIsNotificationsOpen(false);
                  }}
                  className="flex items-center gap-1.5 bg-neutral-mist hover:bg-neutral-mist/80 border border-neutral-mist/80 rounded-lg px-2 py-1 text-xs transition-colors cursor-pointer"
                  aria-label="Staff profile and menu"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0 border border-blue-200">
                    {workspaceSession.memberName.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="text-[11px] font-bold text-primary truncate max-w-20 leading-tight">
                    {workspaceSession.memberName}
                  </span>
                  <span
                    className={`text-[8px] font-extrabold px-1 py-0.2 rounded-full uppercase tracking-wider shrink-0 ${
                      workspaceSession.role === "manager"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {workspaceSession.role === "manager" ? "Mgr" : "Staff"}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-neutral-slate transition-transform duration-200 ${
                      isUserMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-neutral-white border border-neutral-mist rounded-xl shadow-lg py-2 animate-fade-in z-50">
                    <div className="px-3.5 py-2 border-b border-neutral-mist mb-1 bg-neutral-mist/20">
                      <span className="text-[9px] font-extrabold uppercase text-neutral-slate tracking-wider block">
                        Workspace Staff
                      </span>
                      <p className="text-xs font-bold text-primary truncate">
                        {workspaceSession.memberName}
                      </p>
                      {workspaceSession.branchName && (
                        <p className="text-[10px] text-neutral-slate truncate">
                          📍 {workspaceSession.branchName}
                        </p>
                      )}
                      {workspaceSession.merchantName && (
                        <p className="text-[10px] text-blue-700 font-semibold truncate mt-0.5">
                          🏢 {workspaceSession.merchantName}
                        </p>
                      )}
                    </div>

                    {STAFF_MENU_ITEMS.filter((item) => !item.managerOnly || workspaceSession.role === "manager").map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3.5 py-2 text-xs text-neutral-slate hover:bg-neutral-mist transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}

                    <div className="border-t border-neutral-mist my-1.5" />

                    <button
                      type="button"
                      onClick={handleWorkspaceLogout}
                      className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer font-medium"
                    >
                      Sign Out of Workspace
                    </button>
                  </div>
                )}
              </div>
            ) : account ? (
              <div className="flex items-center gap-1">
                <Link
                  href="/settings"
                  className="p-1.5 text-neutral-slate hover:text-primary hover:bg-neutral-mist rounded-lg transition-colors cursor-pointer"
                  aria-label="Settings"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </Link>
                <Link
                  href="/notifications"
                  className="p-1.5 text-neutral-slate hover:text-primary hover:bg-neutral-mist rounded-lg transition-colors relative cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-critical rounded-full" />
                  )}
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={openLogin}
                  className="bg-primary hover:bg-primary-light text-neutral-white font-medium rounded-lg px-3 py-1.5 text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Sign In
                </button>
                <Link
                  href="/workspace/login"
                  className="px-2.5 py-1.5 text-[11px] font-semibold text-neutral-slate hover:text-primary rounded-lg border border-neutral-mist transition-colors"
                >
                  Staff
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
