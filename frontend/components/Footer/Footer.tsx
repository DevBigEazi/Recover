"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-neutral-white border-t border-neutral-mist py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          {/* Brand Logo & Copyright */}
          <div className="space-y-1.5 text-center sm:text-left">
            <Link href="/" className="inline-block">
              <Image
                src="/logo-full.svg"
                alt="Recover Logo"
                width={120}
                height={35}
                className="h-7 sm:h-8 w-auto mx-auto sm:mx-0"
              />
            </Link>
            <p className="text-[11px] text-neutral-slate max-w-xs">
              Privacy-first physical item tracking & loss recovery.
            </p>
            <p className="text-[10px] text-neutral-slate/70">
              © {new Date().getFullYear()} Recover. All rights reserved.
            </p>
          </div>

          {/* Built on Electroneum Blockchain Badge */}
          <div className="flex items-center gap-2.5 bg-neutral-mist/60 border border-neutral-mist rounded-xl px-3.5 py-2 shadow-xs">
            <Image
              src="/ETN.png"
              alt="Electroneum Logo"
              width={20}
              height={20}
              className="w-5 h-5 object-contain"
            />
            <div className="text-xs">
              <span className="text-neutral-slate block text-[9px] uppercase font-bold tracking-wider">Secured Network</span>
              <span className="font-bold text-primary text-xs">Built on Electroneum Blockchain</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
