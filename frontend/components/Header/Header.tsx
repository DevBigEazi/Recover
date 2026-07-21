"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown, Bell, Home, LayoutDashboard, PlusCircle, Info, Settings, LogOut, User as UserIcon } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useActiveAccount, useActiveWallet, useDisconnect } from "thirdweb/react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const account = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const { openLogin } = useAuth();
  const { fullName, username } = useProfile();

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
    refetchInterval: 5000,
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

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Register Item", href: "/register" },
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
            <Link href="/" className="flex items-center space-x-2">
              <Image 
                src="/logo-full.svg" 
                alt="Recover Logo" 
                width={137} 
                height={40} 
                className="h-10 w-auto" 
                priority
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
              {!account ? (
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
                        👤
                      </div>
                      <span className={`${fullName || username ? 'font-sans' : 'font-mono'} text-xs font-semibold`}>
                        {fullName || username || `${account.address.slice(0, 6)}...${account.address.slice(-4)}`}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isUserMenuOpen && (
                     <div className="absolute right-0 mt-2 w-48 bg-neutral-white border border-neutral-mist rounded-xl shadow-lg py-2 animate-fade-in z-50">
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

          {/* Mobile menu and notifications buttons */}
          <div className="flex items-center md:hidden gap-2">
            {account && (
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
            )}

            <button
              onClick={() => {
                setIsMenuOpen(!isMenuOpen);
                setIsNotificationsOpen(false);
              }}
              className="inline-flex items-center justify-center rounded-md p-2 text-neutral-slate hover:text-primary hover:bg-neutral-mist transition-colors focus:outline-hidden"
              aria-label="Toggle navigation menu"
            >
              {!isMenuOpen ? (
                <Menu className="h-6 w-6" />
              ) : (
                <X className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Sidebar Drawer */}
        {isMenuOpen && (
          <>
            {/* Backdrop Overlay */}
            <div
              className="fixed inset-0 bg-neutral-slate/60 backdrop-blur-xs z-50 transition-opacity duration-300 md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Sidebar Drawer */}
            <aside className="fixed top-0 right-0 bottom-0 w-[85%] max-w-xs bg-neutral-white shadow-2xl z-50 flex flex-col justify-between p-6 transition-transform duration-300 ease-in-out md:hidden overflow-y-auto animate-slide-left border-l border-neutral-mist">
              <div className="space-y-6">
                {/* Header Row: Logo & Close Button */}
                <div className="flex items-center justify-between border-b border-neutral-mist pb-4">
                  <Link href="/" onClick={() => setIsMenuOpen(false)}>
                    <Image
                      src="/logo-full.svg"
                      alt="Recover Logo"
                      width={120}
                      height={35}
                      className="h-8 w-auto"
                    />
                  </Link>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 text-neutral-slate hover:text-primary hover:bg-neutral-mist rounded-xl transition-colors cursor-pointer"
                    aria-label="Close sidebar navigation"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* User Profile Info Card (if logged in) */}
                {account && (
                  <div className="bg-neutral-mist/50 border border-neutral-mist rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                      <UserIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="overflow-hidden min-w-0">
                      <div className="text-xs font-bold text-primary truncate">
                        {fullName || username || "Registered User"}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-slate truncate">
                        {account.address.slice(0, 6)}...{account.address.slice(-4)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Items */}
                <nav className="space-y-1.5">
                  <Link
                    href="/"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                      isActive("/")
                        ? "text-primary bg-neutral-mist font-semibold"
                        : "text-neutral-slate hover:text-primary hover:bg-neutral-mist/60"
                    }`}
                  >
                    <Home className="w-4 h-4 text-accent" />
                    <span>Home</span>
                  </Link>

                  <Link
                    href="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                      isActive("/dashboard")
                        ? "text-primary bg-neutral-mist font-semibold"
                        : "text-neutral-slate hover:text-primary hover:bg-neutral-mist/60"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-accent" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    href="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                      isActive("/register")
                        ? "text-primary bg-neutral-mist font-semibold"
                        : "text-neutral-slate hover:text-primary hover:bg-neutral-mist/60"
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 text-accent" />
                    <span>Register Item</span>
                  </Link>

                  {account && (
                    <Link
                      href="/notifications"
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                        isActive("/notifications")
                          ? "text-primary bg-neutral-mist font-semibold"
                          : "text-neutral-slate hover:text-primary hover:bg-neutral-mist/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Bell className="w-4 h-4 text-accent" />
                        <span>Notifications</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="bg-critical text-neutral-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  )}

                  {account && (
                    <Link
                      href="/settings"
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                        isActive("/settings")
                          ? "text-primary bg-neutral-mist font-semibold"
                          : "text-neutral-slate hover:text-primary hover:bg-neutral-mist/60"
                      }`}
                    >
                      <Settings className="w-4 h-4 text-accent" />
                      <span>Settings</span>
                    </Link>
                  )}

                  <Link
                    href="/about"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                      isActive("/about")
                        ? "text-primary bg-neutral-mist font-semibold"
                        : "text-neutral-slate hover:text-primary hover:bg-neutral-mist/60"
                    }`}
                  >
                    <Info className="w-4 h-4 text-accent" />
                    <span>About</span>
                  </Link>
                </nav>
              </div>

              {/* Sidebar Footer Action */}
              <div className="border-t border-neutral-mist pt-4 mt-6">
                {!account ? (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      openLogin();
                    }}
                    className="w-full bg-primary hover:bg-primary-light text-neutral-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors text-center cursor-pointer shadow-xs"
                  >
                    Sign In
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleDisconnect();
                    }}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-red-100"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </aside>
          </>
        )}
      </nav>
    </header>
  );
}
