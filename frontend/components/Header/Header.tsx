"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useActiveAccount, useActiveWallet, useDisconnect } from "thirdweb/react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();

  const account = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const { openLogin } = useAuth();
  const { fullName, username } = useProfile();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Register Item", href: "/register" },
    { name: "About", href: "/about" },
  ];

  const isActive = (href: string) => pathname === href;

  const handleCopyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
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
                      <button
                        onClick={handleCopyAddress}
                        className="w-full text-left px-4 py-2 text-xs text-neutral-slate hover:bg-neutral-mist transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>Copy Address</span>
                        <span className="text-[10px] text-accent font-semibold">{copied ? "Copied!" : ""}</span>
                      </button>
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
                      <div className="border-t border-neutral-mist my-1.5" />
                      <button
                        onClick={handleDisconnect}
                        className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
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

        {/* Mobile Navigation Panel */}
        {isMenuOpen && (
          <div className="md:hidden animate-fade-in pb-4">
            <div className="space-y-1 pt-2 pb-3 border-t border-neutral-mist">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`block rounded-md px-3 py-2.5 text-base font-medium transition-colors ${
                    isActive(link.href)
                      ? "text-primary bg-neutral-mist font-semibold"
                      : "text-neutral-slate hover:text-primary hover:bg-neutral-mist"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              
              {/* Mobile Connect Wallet */}
              {!account ? (
                <div className="pt-4 border-t border-neutral-mist mt-3">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      openLogin();
                    }}
                    className="w-full bg-primary hover:bg-primary-light text-neutral-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors text-center cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-neutral-mist mt-3 space-y-2">
                  <div className="flex items-center justify-between px-3 py-2 bg-neutral-mist rounded-lg">
                    <span className={`${fullName || username ? 'font-sans' : 'font-mono'} text-xs font-semibold text-primary`}>
                      {fullName || username || `${account.address.slice(0, 6)}...${account.address.slice(-4)}`}
                    </span>
                    <button
                      onClick={handleCopyAddress}
                      className="text-xs font-semibold text-accent cursor-pointer"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleDisconnect();
                    }}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors text-center cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
