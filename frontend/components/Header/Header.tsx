"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ConnectButton, lightTheme } from "thirdweb/react";
import { client } from "@/lib/client";
import { electroneum } from "@/lib/chain";

const customTheme = lightTheme({
  colors: {
    accentText: "#0EA394", // Teal accent
    primaryButtonBg: "#1E2A4A", // Deep Indigo primary button
    primaryButtonText: "#FFFFFF", // White text
    connectedButtonBg: "#FFFFFF", // White background
    connectedButtonBgHover: "#F5F6F8", // Mist hover background
    modalBg: "#FFFFFF",
  },
});

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Register Item", href: "/register" },
  ];

  const isActive = (href: string) => pathname === href;

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
              <ConnectButton 
                client={client} 
                chain={electroneum}
                theme={customTheme}
                connectButton={{
                  className: "connect-btn-override",
                }}
              />
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
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
              <div className="pt-4 border-t border-neutral-mist mt-3">
                <ConnectButton 
                  client={client} 
                  chain={electroneum}
                  theme={customTheme}
                />
              </div>
            </div>
          </div>
        )}
      </nav>
      
      <style>{`
        .connect-btn-override {
          font-family: var(--font-sans) !important;
          font-weight: 500 !important;
          border-radius: 8px !important;
          padding: 8px 16px !important;
          transition: background-color 0.2s ease-in-out !important;
        }
      `}</style>
    </header>
  );
}
