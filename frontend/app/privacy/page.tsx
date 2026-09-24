"use client";

import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import { ShieldCheck, Clock, FileText } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-neutral-mist flex flex-col justify-between">
      <div>
        <Header />

        <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 sm:px-6 lg:px-8 space-y-8">
          {/* Header Tag & Title */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/15 text-xs text-primary font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>Legal &amp; Compliance</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary font-display">
              Privacy Policy
            </h1>
            <div className="flex items-center gap-2 text-xs text-neutral-slate">
              <Clock className="w-3.5 h-3.5" />
              <span>Status: Formal Framework Under Final Legal Review</span>
            </div>
          </div>

          {/* Policy Overview Card */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0 mt-0.5">
                <FileText className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-primary font-display">
                  Our Privacy Architecture
                </h2>
                <p className="text-sm text-neutral-slate leading-relaxed">
                  Recover is architected from the ground up as a privacy-first protocol. We believe your personal identity, contact coordinates, and physical property must never be unnecessarily exposed or monetized.
                </p>
              </div>
            </div>

            <div className="border-t border-neutral-mist/80 pt-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary font-display">
                Core Privacy Guarantees
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-neutral-slate">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                  <span>
                    <strong className="text-primary">Off-Chain Data Protection:</strong> Personal contact info (phone numbers, physical addresses, photos, secret identifiers) is stored securely off-chain and never placed in public ledger calldata.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                  <span>
                    <strong className="text-primary">Zero-Auth Public Finders:</strong> Good Samaritans scanning lost items or dispatch packages submit updates without signing up, downloading mobile apps, or exposing personal data.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                  <span>
                    <strong className="text-primary">Cross-Jurisdiction Compliance:</strong> Structuring data retention and e-invoicing audit standards in compliance with Nigerian NRS mandates and US commercial data privacy laws.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl bg-neutral-mist/60 border border-neutral-mist p-4 text-xs text-neutral-slate space-y-1">
              <p className="font-semibold text-primary">Notice</p>
              <p>
                Our finalized legal terms and comprehensive data protection agreements are undergoing dual-jurisdiction legal certification (Nigeria &amp; United States). For immediate privacy inquiries or data requests, contact{" "}
                <a href="mailto:support@recover.xyz" className="text-accent underline font-medium">
                  support@recover.xyz
                </a>.
              </p>
            </div>
          </div>

          {/* Quick Back Navigation */}
          <div className="pt-2 text-center sm:text-left">
            <Link
              href="/"
              className="text-xs font-semibold text-primary hover:text-accent transition-colors"
            >
              ← Return to Home
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
