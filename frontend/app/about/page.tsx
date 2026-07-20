"use client";

import Header from "@/components/Header/Header";
import Link from "next/link";

export default function AboutPage() {
  const steps = [
    {
      num: "01",
      title: "Register Your Valuables",
      desc: "Log in with Google, Email, or Social account and register your items (phones, laptops, keys, bags, pets). A unique secure registration ID is generated for each item.",
    },
    {
      num: "02",
      title: "Print & Attach Sticker",
      desc: "Download and print your sticker in your preferred size preset (Mini, Standard, or Large). Attach it securely to your physical item where finders can easily see and scan it.",
    },
    {
      num: "03",
      title: "Instant Mobile Scan",
      desc: "If an item goes missing, flag it as 'Lost' on your dashboard. When a finder scans the sticker with their phone camera, they land on a mobile verification page with no app download required.",
    },
    {
      num: "04",
      title: "Safe Drop-Off & Recovery",
      desc: "Finders can submit a message, share map coordinates, or use direct action buttons. Meet in a safe public space and verify ownership via Handover PIN codes.",
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-mist pb-16">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        
        {/* Banner Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-primary font-display sm:text-5xl">
            How Recover Works
          </h1>
          <p className="text-md text-neutral-slate leading-relaxed">
            Recover bridges physical items with smart digital protection. Protect your everyday valuables with printable QR stickers that allow finders to contact you safely and privately.
          </p>
        </div>

        {/* Step-by-Step Recovery Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {steps.map((step) => (
            <div
              key={step.num}
              className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs hover:shadow-md transition-shadow duration-200 flex gap-4"
            >
              <span className="text-2xl font-bold font-mono text-accent shrink-0 select-none">
                {step.num}
              </span>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-primary font-display">{step.title}</h3>
                <p className="text-sm text-neutral-slate leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy & Security Safeguards Section */}
        <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-8 sm:p-10 shadow-xs space-y-6">
          <div className="border-b border-neutral-mist pb-4">
            <h2 className="text-2xl font-bold text-primary font-display">Built-In Privacy Safeguards</h2>
            <p className="text-xs text-neutral-slate mt-1">
              Your security and personal privacy are protected by design at every step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <h4 className="font-bold text-primary flex items-center gap-1.5">
                <span className="text-accent text-lg">🔒</span> Privacy-First Protection
              </h4>
              <p className="text-neutral-slate leading-relaxed">
                We never expose plain-text personal details (such as home address or primary phone numbers) on the public internet. Your identity remains private until you choose to share it.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-primary flex items-center gap-1.5">
                <span className="text-accent text-lg">📱</span> No App Required for Finders
              </h4>
              <p className="text-neutral-slate leading-relaxed">
                Finders do not need to install an app, create an account, or complete a technical setup. They scan and communicate instantly from any mobile browser.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-primary flex items-center gap-1.5">
                <span className="text-accent text-lg">💬</span> Direct & Safe Communication
              </h4>
              <p className="text-neutral-slate leading-relaxed">
                Communicate with finders safely via instant in-app messages or direct Call, WhatsApp, and Email action buttons without putting your privacy at risk.
              </p>
            </div>
          </div>
        </div>

        {/* Sticker Guidelines Section */}
        <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-8 sm:p-10 shadow-xs space-y-6">
          <div className="border-b border-neutral-mist pb-4">
            <h2 className="text-2xl font-bold text-primary font-display">QR Code Sticker Guidelines</h2>
            <p className="text-xs text-neutral-slate mt-1">
              Maximize the chances of your lost items being safely recovered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div className="space-y-3">
              <h4 className="font-bold text-primary">Best Placement Spots:</h4>
              <ul className="space-y-2 text-neutral-slate list-disc pl-5 leading-relaxed">
                <li><strong>Wallets & Purses:</strong> Place the sticker on the inside cover or a prominent card slot.</li>
                <li><strong>Electronics:</strong> Back of laptops, tablets, or under phone cases.</li>
                <li><strong>Keys & Bags:</strong> Attach to keychains, luggage tags, or backpack strap tags.</li>
                <li><strong>Passports & Documents:</strong> Inside the back cover of travel documents.</li>
              </ul>
            </div>
            
            <div className="space-y-3 bg-neutral-mist/35 p-6 rounded-xl border border-neutral-mist">
              <h4 className="font-bold text-primary flex items-center gap-1.5">
                💡 Safety Meetup Recommendations:
              </h4>
              <p className="text-neutral-slate leading-relaxed">
                When coordinating item pickups with finders, always prioritize your safety. Arrange meetups in well-lit, busy public areas such as coffee shops, shopping centers, or near transit entrances. Bringing a friend or meeting during daylight hours is highly recommended.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Call to Action */}
        <div className="text-center pt-4">
          <Link
            href="/dashboard"
            className="inline-flex bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-lg px-6 py-3 text-sm transition-colors duration-200"
          >
            Go to Your Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
