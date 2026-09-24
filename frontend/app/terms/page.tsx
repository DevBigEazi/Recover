"use client";

import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import { ShieldCheck, Clock, FileCheck } from "lucide-react";
import Link from "next/link";

export default function TermsOfServicePage() {
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
              Terms of Service
            </h1>
            <div className="flex items-center gap-2 text-xs text-neutral-slate">
              <Clock className="w-3.5 h-3.5" />
              <span>Status: Formal Master Service Agreement Under Final Legal Review</span>
            </div>
          </div>

          {/* Terms Overview Card */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0 mt-0.5">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-primary font-display">
                  Platform Terms &amp; Conditions
                </h2>
                <p className="text-sm text-neutral-slate leading-relaxed">
                  These Terms govern the use of Recover Protocol&apos;s physical item protection, point-of-sale digital receipts, and logistics dispatch custody tracking infrastructure.
                </p>
              </div>
            </div>

            <div className="border-t border-neutral-mist/80 pt-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary font-display">
                Key Operating Principles
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-neutral-slate">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                  <span>
                    <strong className="text-primary">Merchant POS Operations:</strong> Merchants issuing digital receipts are responsible for inventory pricing accuracy, local tax collection, and compliance with statutory e-invoicing standards.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                  <span>
                    <strong className="text-primary">Package Dispatch Custody:</strong> Handover verification codes and scratch-off PIN matches establish non-repudiation during commercial deliveries.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                  <span>
                    <strong className="text-primary">Physical Reward Disclaimer:</strong> Any recovery rewards indicated on lost item reports are coordinate-based, non-custodial, and subject to in-person physical owner verification.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl bg-neutral-mist/60 border border-neutral-mist p-4 text-xs text-neutral-slate space-y-1">
              <p className="font-semibold text-primary">Notice</p>
              <p>
                Our comprehensive merchant agreements, consumer terms of use, and API developer terms of service are currently undergoing legal completion. For enterprise contract inquiries or legal notices, contact{" "}
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
