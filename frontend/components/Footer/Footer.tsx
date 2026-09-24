"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-neutral-white border-t border-neutral-mist py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Brand & Slogan */}
          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-block">
              <Image
                src="/logo-full.svg"
                alt="Recover Logo"
                width={120}
                height={35}
                className="h-7 sm:h-8 w-auto"
              />
            </Link>
            <p className="text-xs text-neutral-slate max-w-xs leading-relaxed">
              Smart physical item protection, digital receipts &amp; logistics tracking.
            </p>
            <p className="text-[11px] text-neutral-slate/70">
              © {new Date().getFullYear()} Recover. All rights reserved.
            </p>
          </div>

          {/* Col 2: Solutions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary font-display">
              Solutions
            </h4>
            <ul className="space-y-2 text-xs font-medium text-neutral-slate">
              <li>
                <Link href="/workspace" className="hover:text-primary transition-colors">
                  POS &amp; Digital Receipts
                </Link>
              </li>
              <li>
                <Link href="/shipments" className="hover:text-primary transition-colors">
                  Logistics &amp; Shipments
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-primary transition-colors">
                  Personal Items Vault
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary font-display">
              Platform
            </h4>
            <ul className="space-y-2 text-xs font-medium text-neutral-slate">
              <li>
                <Link href="/pricing" className="hover:text-primary transition-colors">
                  Pricing &amp; Plans
                </Link>
              </li>
              <li>
                <Link href="/developers" className="hover:text-primary transition-colors">
                  Developer API &amp; Webhooks
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  About Recover
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Network & Security Badge */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary font-display">
              Infrastructure
            </h4>
            <div className="flex items-center gap-2.5 bg-neutral-mist/60 border border-neutral-mist rounded-xl px-3.5 py-2.5 shadow-xs w-fit sm:w-auto">
              <Image
                src="/ETN.png"
                alt="Electroneum Logo"
                width={22}
                height={22}
                className="w-5.5 h-5.5 object-contain shrink-0"
              />
              <div className="text-xs">
                <span className="text-neutral-slate block text-[9px] uppercase font-bold tracking-wider">
                  Secured Network
                </span>
                <span className="font-bold text-primary text-xs">
                  Powered by Electroneum
                </span>
              </div>
            </div>
            <p className="text-[11px] text-neutral-slate/70 leading-relaxed">
              Tamperproof proof-of-purchase, custody handovers, and ownership verification.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
