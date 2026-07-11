"use client";

import Header from "@/components/Header/Header";
import Link from "next/link";

export default function AboutPage() {
  const steps = [
    {
      num: "01",
      title: "Register Item On-Chain",
      desc: "Connect your wallet and register your valuable items (wallets, keys, laptops) on the Electroneum blockchain. We generate a unique registration ID for each item.",
    },
    {
      num: "02",
      title: "Print & Attach Sticker",
      desc: "Download and print the high-contrast QR code sticker. Attach it securely to your physical item where finders can easily see and scan it.",
    },
    {
      num: "03",
      title: "Safe Scan Recovery",
      desc: "If your item goes missing, mark it as 'Lost' on your dashboard. When a finder scans the sticker, they are redirected to a secure verification portal with no wallet required.",
    },
    {
      num: "04",
      title: "Coordinate Delivery",
      desc: "Finders can submit a location coordinate, upload a photo, and send an anonymous message to the owner. Coordinate a safe drop-off without revealing sensitive PII.",
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
            Recover is a decentralized lost-and-found protocol built on the Electroneum blockchain. We bridge the gap between physical items and digital ownership to ensure privacy-first asset recovery.
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
            <h2 className="text-2xl font-bold text-primary font-display">On-Chain Privacy Safeguards</h2>
            <p className="text-xs text-neutral-slate mt-1">
              Your security and privacy are built directly into the smart contract's protocol.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <h4 className="font-bold text-primary flex items-center gap-1.5">
                <span className="text-accent text-lg">🔒</span> Cryptographic Hashing
              </h4>
              <p className="text-neutral-slate leading-relaxed">
                We never store plain-text personal details (names, emails, phone numbers) on the public blockchain. Only a secure SHA-256 hash of item metadata is committed.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-primary flex items-center gap-1.5">
                <span className="text-accent text-lg">🛡️</span> Zero-Wallet Finder Portal
              </h4>
              <p className="text-neutral-slate leading-relaxed">
                Finders do not need to install Web3 extensions, purchase coins, or connect wallets to submit a report. They scan and communicate instantly from any mobile browser.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-primary flex items-center gap-1.5">
                <span className="text-accent text-lg">💬</span> Private Communications
              </h4>
              <p className="text-neutral-slate leading-relaxed">
                The finder report inbox remains entirely off-chain. Communications are decoupled from block storage to prevent spam, tracking, or unexpected gas fees.
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
