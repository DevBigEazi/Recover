"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import { Check, ArrowRight, ShieldCheck, Sparkles, Smartphone, Key, Lock, Globe } from "lucide-react";
import { detectUserCurrency, convertUsdPrice, UserCurrencyInfo } from "@/lib/currency";

export default function PricingPage() {
  const [userCurrency, setUserCurrency] = useState<UserCurrencyInfo | null>(null);

  useEffect(() => {
    detectUserCurrency().then(setUserCurrency);
  }, []);

  const phonePrice = convertUsdPrice(3.50, userCurrency);
  const generalPrice = convertUsdPrice(1.50, userCurrency);

  return (
    <main className="min-h-screen bg-neutral-mist flex flex-col justify-between">
      <div>
        <Header />

        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-16 sm:px-6 lg:px-8 space-y-12">
          
          {/* Page Banner Header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-accent uppercase tracking-wider select-none shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-accent" /> 100% Free Protection · Pay Only When Recovered
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-primary font-display sm:text-5xl">
              Simple, Honest, Transparent
            </h1>
            
            <p className="text-sm sm:text-base text-neutral-slate leading-relaxed">
              No monthly subscriptions. No hidden device fees. Registering your everyday valuables and generating printable QR stickers is completely free forever.
            </p>

            {/* Geo & Currency Info Banner */}
            <div className="inline-flex items-center gap-2 bg-neutral-white border border-neutral-mist px-4 py-2 rounded-full text-xs font-medium text-neutral-slate shadow-2xs">
              <Globe className="w-3.5 h-3.5 text-accent" />
              <span>
                {phonePrice.isNigeria ? (
                  <>
                    Location: <strong className="text-primary font-bold">Nigeria (NG)</strong> · Prices in <strong className="text-primary font-bold">NGN (₦)</strong> · Checkout via <strong className="text-primary font-bold">Paystack</strong>
                  </>
                ) : (
                  <>
                    Location: <strong className="text-primary font-bold">{userCurrency?.countryCode || "International"}</strong> · Prices in <strong className="text-primary font-bold">USD ($)</strong> · Checkout via <strong className="text-primary font-bold">Stripe</strong>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
            {/* Card 1: Free Protection Always */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-primary font-display">Active Protection</h3>
                  <p className="text-xs text-neutral-slate">
                    Register all your personal belongings and download print-ready QR stickers.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-primary font-display">$0</span>
                    <span className="text-xs font-semibold text-neutral-slate">forever free</span>
                  </div>
                  <p className="text-[11px] text-accent font-semibold">Zero upfront cost · No credit card required</p>
                </div>

                <ul className="space-y-3 pt-4 border-t border-neutral-mist text-xs text-neutral-slate">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Unlimited personal item registrations</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Printable QR Sticker Studio (Mini, Standard, Large)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Instant lost-status toggle (`Active` ↔ `Lost`)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Gasless on-chain ownership registry (Electroneum)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Real-time Web Push &amp; In-App alert notifications</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  href="/register"
                  className="w-full bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-xl py-3 text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  Register Items Free <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card 2: Standard Item Recovery Unlock */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <Key className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-primary font-display">Everyday Recovery</h3>
                  <p className="text-xs text-neutral-slate">
                    Wallets, Keys, Bags, Laptops, Bicycles, Pet Collars, and Luggage.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-primary font-display">
                      {generalPrice.formattedLocal}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-slate">
                    One-time unlock fee via {generalPrice.paymentGateway === "paystack" ? "Paystack" : "Stripe"} only when item is reported found
                  </p>
                </div>

                <ul className="space-y-3 pt-4 border-t border-neutral-mist text-xs text-neutral-slate">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Unlock Finder’s full phone &amp; email contact info</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Access high-res verification photos uploaded by finder</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>GPS pinpoint coordinates &amp; AI location insights</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Secure physical handshake PIN verification</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>All subsequent report updates remain unlocked</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  href="/dashboard"
                  className="w-full bg-neutral-mist hover:bg-neutral-mist/80 border border-gray-300 text-primary font-semibold rounded-xl py-3 text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs"
                >
                  View Your Items
                </Link>
              </div>
            </div>

            {/* Card 3: Phone Recovery Unlock (Featured) */}
            <div className="bg-neutral-white border-2 border-accent rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-neutral-white text-[10px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full shadow-xs">
                Most Critical Value
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-primary font-display">Smartphone Recovery</h3>
                  <p className="text-xs text-neutral-slate">
                    iPhones, Android devices, and Cellular Tablets.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-primary font-display">
                      {phonePrice.formattedLocal}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-slate">
                    One-time unlock fee via {phonePrice.paymentGateway === "paystack" ? "Paystack" : "Stripe"} per recovery cycle
                  </p>
                </div>

                <ul className="space-y-3 pt-4 border-t border-neutral-mist text-xs text-neutral-slate">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span className="font-semibold text-primary">Emergency Alternate Contact dispatch</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Instant finder direct-contact unlock</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>High-accuracy reverse-geocoded GPS coordinates</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Gemini AI contextual neighborhood summarization</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>One-time unlock covers entire loss event</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  href="/register"
                  className="w-full bg-accent hover:bg-accent/90 text-neutral-white font-semibold rounded-xl py-3 text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  Protect Your Phone Free <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Privacy & Guarantee FAQ */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-6">
            <h3 className="text-lg font-bold text-primary font-display text-center">
              Frequently Asked Questions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-primary">Why is registration free?</h4>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  We believe basic protection should be accessible to everyone. You can register as many items as you own, print QR stickers, and track status with zero upfront charges.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-primary">Why is there an unlock fee?</h4>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  The micro-fee ({generalPrice.isNigeria ? "₦2,200 / ₦5,200 NGN via Paystack" : "$1.50 / $3.50 USD via Stripe"}) covers our gasless blockchain relayer, secure GPS reverse-geocoding, and push notification infrastructure only when you receive an authentic report from a finder.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-primary">What happens if I lose my phone?</h4>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  When you register a phone, Recover requires an alternate contact (friend or partner’s phone or secondary email). If someone finds your phone, alerts are instantly routed to that trusted contact.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-primary">Does the finder need an app or crypto?</h4>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  No! Any smartphone camera scans your sticker and opens a lightweight mobile web page in under two seconds. Finders never sign up, install apps, or touch cryptocurrency.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
}
