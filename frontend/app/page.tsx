"use client";

import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-mist flex flex-col justify-between">
      <div>
        <Header />

        {/* Hero Section */}
        <section className="relative overflow-hidden py-10 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center space-y-4 sm:space-y-6 max-w-3xl mx-auto">
              {/* Tagline Badge */}
              <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold text-accent uppercase tracking-wider select-none shadow-xs">
                🛡️ AI-Powered & Decentralized Registry
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-primary font-display sm:text-5xl lg:text-6xl leading-tight">
                AI-Powered Smart Protection & Private Recovery for Your Valuables
              </h1>
              
              <p className="text-sm sm:text-lg text-neutral-slate leading-relaxed max-w-2xl mx-auto">
                Recover is a smart, AI-powered lost and found platform. Attach printable, scannable QR stickers to your phone, laptop, keys, and bags, use AI to generate recovery instructions, and get secure AI-contextualized scan locations automatically.
              </p>

              <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-xl px-8 py-3 sm:py-3.5 text-sm transition-all shadow-md hover:shadow-lg text-center cursor-pointer"
                >
                  Go to Dashboard
                </Link>
                
                <Link
                  href="/about"
                  className="w-full sm:w-auto bg-neutral-white hover:bg-neutral-mist border border-gray-300 text-primary font-semibold rounded-xl px-8 py-3 sm:py-3.5 text-sm transition-all shadow-xs text-center cursor-pointer"
                >
                  How It Works
                </Link>
              </div>
            </div>
          </div>

          {/* Ambient background decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-87.5 sm:w-125 h-87.5 sm:h-125 bg-accent/5 rounded-full blur-3xl pointer-events-none z-0" />
        </section>

        {/* Feature Grid */}
        <section className="bg-neutral-white border-t border-neutral-mist py-10 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-16">
              <h2 className="text-2xl font-bold text-primary font-display sm:text-4xl">
                Privacy-First Recoveries
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-neutral-slate">
                Engineered with security defaults to protect your identity and coordinate safe item drop-offs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Feature 1 */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="p-2.5 bg-accent/10 rounded-xl w-max text-xl sm:text-2xl">
                  🔒
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary font-display">Privacy-First Protection</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Your personal details stay protected by default. We never expose your private address or primary contact info to the public internet.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="p-2.5 bg-accent/10 rounded-xl w-max text-xl sm:text-2xl">
                  📱
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary font-display">No App Download Required</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Anyone who finds your lost item can simply scan the QR sticker using their regular smartphone camera to view verification info and contact you.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="p-2.5 bg-accent/10 rounded-xl w-max text-xl sm:text-2xl">
                  💬
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary font-display">Direct & Safe Communication</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Receive instant messages, view shared map locations, or let finders reach you via direct Call, WhatsApp, or Email action buttons.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="p-2.5 bg-accent/10 rounded-xl w-max text-xl sm:text-2xl">
                  🤖
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary font-display">AI Recovery Assistance</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Let AI suggest customized recovery instructions, help finders draft polite templates, and summarize coordinates into safety insights.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
