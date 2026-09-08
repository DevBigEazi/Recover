"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Bell } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useActiveWallet, useDisconnect } from "thirdweb/react";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function Header() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const { account, isAuthLoading } = useAuthReady();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  // Keep useActiveAccount for wallet-specific hooks that need the raw account
  const { openLogin } = useAuth();
  const { fullName, companyName, username, role, plan, billingCycle } = useProfile();

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

  const navLinks = role === "merchant"
    ? [
        { name: "Home", href: "/" },
        { name: "Shipments", href: "/shipments" },
        { name: "Pricing", href: "/pricing" },
        { name: "Developers", href: "/developers" },
        { name: "About", href: "/about" },
      ]
    : [
        { name: "Home", href: "/" },
        { name: "Dashboard", href: "/dashboard" },
        { name: "Register Item", href: "/register" },
        { name: "Pricing", href: "/pricing" },
        { name: "Developers", href: "/developers" },
        { name: "About", href: "/about" },
      ];

  const isActive = (href: string) => pathname === href;

  const handleDisconnect = () => {
    if (activeWallet) {
      disconnect(activeWallet);
    }
    setIsUserMenuOpen(false);
  };

  return (
    <header className="bg-neutral-white border-b border-neutral-mist sticky top-0 z-50 shadow-xs">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo / Wordmark lockup */}
          <div className="flex items-center">
            <Link
              href={role === "merchant" ? "/shipments" : account ? "/dashboard" : "/"}
              className="flex items-center space-x-2"
            >
              <Image 
                src="/logo-full.svg" 
                alt="Recover Logo" 
                width={137} 
                height={40} 
                className="h-10 w-auto" 
                loading="eager"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <div className="flex items-baseline space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors duration-200 rounded-md ${
                    isActive(link.href)
                      ? "text-primary font-semibold"
                      : "text-neutral-slate hover:text-primary hover:bg-neutral-mist"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            
            {/* Desktop Connect Wallet Button */}
            <div className="flex items-center">
              {isAuthLoading ? (
                <div className="w-20 h-9 bg-neutral-mist animate-pulse rounded-lg" />
              ) : !account ? (
                <button
                  onClick={openLogin}
                  className="bg-primary hover:bg-primary-light text-neutral-white font-medium rounded-lg px-5 py-2 text-sm transition-colors shadow-xs cursor-pointer"
                >
                  Sign In
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  {/* Notifications Dropdown */}
                  <div className="relative">
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
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(!isUserMenuOpen);
                        setIsNotificationsOpen(false);
                      }}
                      className="flex items-center space-x-2 bg-neutral-mist hover:bg-neutral-mist/80 border border-gray-300 text-primary font-medium rounded-lg px-4 py-2 text-sm transition-colors cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-full bg-[#1e2a4a0a] flex items-center justify-center text-xs border border-gray-200">
                        {role === "merchant" ? "🏢" : "👤"}
                      </div>
                      <span className={`${(role === "merchant" ? companyName : fullName) || username ? 'font-sans' : 'font-mono'} text-xs font-semibold`}>
                        {role === "merchant"
                          ? (companyName || fullName || username || `${account.address.slice(0, 6)}...${account.address.slice(-4)}`)
                          : (fullName || username || `${account.address.slice(0, 6)}...${account.address.slice(-4)}`)}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-52 bg-neutral-white border border-neutral-mist rounded-xl shadow-lg py-2 animate-fade-in z-50">
                        {role === "merchant" ? (
                          <>
                            <div className="px-4 py-2 border-b border-neutral-mist mb-1 bg-neutral-mist/20">
                              <span className="text-[9px] font-extrabold uppercase text-neutral-slate tracking-wider block">Merchant Plan</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-bold text-primary">
                                  {plan === "pro_lite" ? "Pro Lite" : plan === "pro_starter" ? "Pro Starter" : plan === "pro_growth" ? "Pro Growth" : plan === "pro_scale" ? "Pro Scale" : plan === "pro" ? "Pro Tier" : "Free Tier"}
                                </span>
                                <span className="bg-blue-100 text-blue-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                                  {billingCycle === "yearly" ? "Annual" : "Monthly"}
                                </span>
                              </div>
                            </div>
                            <Link
                              href="/shipments"
                              className="block px-4 py-2 text-xs text-neutral-slate hover:bg-neutral-mist transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              Shipments Workspace
                            </Link>
                            <Link
                              href="/settings"
                              className="block px-4 py-2 text-xs text-neutral-slate hover:bg-neutral-mist transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              Company Settings
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link
                              href="/dashboard"
                              className="block px-4 py-2 text-xs text-neutral-slate hover:bg-neutral-mist transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              Dashboard
                            </Link>
                            <Link
                              href="/register"
                              className="block px-4 py-2 text-xs text-neutral-slate hover:bg-neutral-mist transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              Register Item
                            </Link>
                            <Link
                              href="/settings"
                              className="block px-4 py-2 text-xs text-neutral-slate hover:bg-neutral-mist transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              Settings
                            </Link>
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
          </div>

          {/* Mobile header action: Notifications or Sign In */}
          <div className="flex items-center md:hidden gap-2">
            {account ? (
              <Link
                href="/notifications"
                className="p-2 text-neutral-slate hover:text-primary hover:bg-neutral-mist rounded-lg transition-colors relative cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-critical rounded-full" />
                )}
              </Link>
            ) : (
              <button
                onClick={openLogin}
                className="bg-primary hover:bg-primary-light text-neutral-white font-medium rounded-lg px-3.5 py-1.5 text-xs transition-colors shadow-xs cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
