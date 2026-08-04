"use client";

import { useState, FormEvent } from "react";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  Terminal,
  Code2,
  Sparkles,
  Webhook,
  Layers,
  ArrowRight,
  CheckCircle2,
  Mail,
  Zap,
  ShieldCheck,
} from "lucide-react";

export default function DevelopersPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    // Simulate early access subscription
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);
    setIsSubscribed(true);
    toast.success("You're on the developer early access list!");
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500 selection:text-white flex flex-col justify-between">
      <div>
        <Header />

        {/* Hero & Coming Soon Container */}
        <main className="max-w-6xl mx-auto px-4 pt-12 pb-20 sm:pt-20 sm:pb-28">
          {/* Glowing Background Accents */}
          <div className="relative">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-32 right-1/4 w-72 h-72 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 text-center space-y-6 max-w-3xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-4 py-1.5 rounded-full text-xs font-semibold text-indigo-300 uppercase tracking-widest backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Developer Portal &amp; API · Coming Soon</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
                Build Next-Gen Logistics &amp; Tracking Apps with{" "}
                <span className="bg-linear-to-r from-indigo-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  Recover API
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal max-w-2xl mx-auto">
                We are crafting a high-performance REST API, webhooks stream, and developer SDKs to let you automate parcel tracking, PIN handovers, and item recovery directly in your applications.
              </p>

              {/* Early Access Form */}
              <div className="pt-4 max-w-md mx-auto">
                {isSubscribed ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-center gap-3 text-emerald-300 font-semibold text-sm backdrop-blur-md">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Early access requested! We will notify you when API keys launch.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your work email"
                        className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-white placeholder:text-slate-500 outline-none transition-colors shadow-inner"
                        disabled={isSubmitting}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Joining...</span>
                      ) : (
                        <>
                          <span>Get Early Access</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
                <p className="text-xs text-slate-500 mt-2.5">
                  Join merchant developers and logistics teams on the waitlist. Zero spam.
                </p>
              </div>
            </div>

            {/* Feature Teasers Grid */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {/* Card 1: REST API */}
              <div className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 backdrop-blur-xl group">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 mb-5 group-hover:bg-indigo-500/20 transition-colors">
                  <Code2 className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                  <span>REST API v1</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                    In Progress
                  </span>
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Programmatically register shipments, create physical QR tracking labels, query parcel history, and verify handover PINs via clean JSON endpoints.
                </p>
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-slate-400">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>POST /api/v1/shipments/create</span>
                </div>
              </div>

              {/* Card 2: Webhook Stream */}
              <div className="bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 backdrop-blur-xl group">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 mb-5 group-hover:bg-blue-500/20 transition-colors">
                  <Webhook className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                  <span>Real-Time Webhooks</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/30">
                    In Progress
                  </span>
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Stream instant HTTP callbacks to your ERP or e-commerce store whenever a parcel is registered, scanned by a rider, delivered, or disputed.
                </p>
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-slate-400">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  <span>event: package.delivered</span>
                </div>
              </div>
            </div>

            {/* Quick Link Navigation Box */}
            <div className="mt-12 bg-linear-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-md">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-base font-bold text-white">Need to track your commercial shipments today?</h4>
                <p className="text-xs sm:text-sm text-slate-400">
                  Access the merchant logistics dashboard to manage active dispatches and view tracking metrics.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link
                  href="/shipments"
                  className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl border border-slate-700 transition-colors"
                >
                  Shipments Dashboard
                </Link>
                <Link
                  href="/pricing"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-md"
                >
                  View Plan Capacity
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
