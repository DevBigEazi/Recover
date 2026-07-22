"use client";

import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";

export default function AboutPage() {
  const steps = [
    {
      num: "01",
      title: "Register Your Valuables",
      desc: "Log in with Google, Email, or Social account and register your items in our decentralized blockchain registry. Leverage AI to automatically generate personalized recovery instructions.",
    },
    {
      num: "02",
      title: "Print & Attach Sticker",
      desc: "Download and print your sticker in your preferred size preset (Mini or Standard). Attach it securely to your physical item where finders can easily see and scan it.",
    },
    {
      num: "03",
      title: "Instant Mobile Scan",
      desc: "If an item goes missing, flag it as 'Lost' on your dashboard. When a finder scans the sticker with their phone camera, they land on a mobile verification page with no app download required.",
    },
    {
      num: "04",
      title: "Safe Drop-Off & Recovery",
      desc: "Finders can use AI message templates to draft polite, clear coordination updates. Owners receive safe meetup locations and AI-generated coordinates context.",
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-mist flex flex-col justify-between">
      <div>
        <Header />

        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-12 sm:px-6 lg:px-8 space-y-6 sm:space-y-12">
          
          {/* Banner Section */}
          <div className="text-center space-y-3 sm:space-y-4 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight text-primary font-display sm:text-5xl">
              How Recover Works
            </h1>
            <p className="text-sm sm:text-md text-neutral-slate leading-relaxed">
              Recover bridges physical items with smart digital protection. Protect your everyday valuables with printable QR stickers that allow finders to contact you safely and privately.
            </p>
          </div>

          {/* Step-by-Step Recovery Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2 sm:pt-4">
            {steps.map((step) => (
              <div
                key={step.num}
                className="bg-neutral-white border border-neutral-mist rounded-2xl p-5 sm:p-8 shadow-xs hover:shadow-md transition-shadow duration-200 flex gap-3.5 sm:gap-4"
              >
                <span className="text-xl sm:text-2xl font-bold font-mono text-accent shrink-0 select-none">
                  {step.num}
                </span>
                <div className="space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-lg font-bold text-primary font-display">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Privacy & Security Safeguards Section */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-10 shadow-xs space-y-4 sm:space-y-6">
            <div className="border-b border-neutral-mist pb-3 sm:pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-primary font-display">Built-In Privacy Safeguards</h2>
              <p className="text-xs text-neutral-slate mt-1">
                Your security and personal privacy are protected by design at every step.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-xs leading-relaxed">
              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <span className="text-accent text-base sm:text-lg">🔒</span> Privacy-First Protection
                </h4>
                <p className="text-neutral-slate">
                  We never expose plain-text personal details (such as home address or primary phone numbers) on the public internet. Your identity remains private until you choose to share it.
                </p>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <span className="text-accent text-base sm:text-lg">📱</span> No App Required
                </h4>
                <p className="text-neutral-slate">
                  Finders do not need to install an app, create an account, or complete a technical setup. They scan and communicate instantly from any mobile browser.
                </p>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <span className="text-accent text-base sm:text-lg">💬</span> Safe Communication
                </h4>
                <p className="text-neutral-slate">
                  Communicate with finders safely via instant in-app messages or direct Call, WhatsApp, and Email action buttons without putting your privacy at risk.
                </p>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <span className="text-accent text-base sm:text-lg">🤖</span> AI Safety Insights
                </h4>
                <p className="text-neutral-slate">
                  Our system automatically analyzes report coordinates and translates them into semantic context to give you clear guidance on coordinates security.
                </p>
              </div>
            </div>
          </div>

          {/* Sticker Guidelines Section */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-10 shadow-xs space-y-4 sm:space-y-6">
            <div className="border-b border-neutral-mist pb-3 sm:pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-primary font-display">QR Code Sticker Guidelines</h2>
              <p className="text-xs text-neutral-slate mt-1">
                Maximize the chances of your lost items being safely recovered.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 text-xs sm:text-sm">
              <div className="space-y-2 sm:space-y-3">
                <h4 className="font-bold text-primary">Best Placement Spots:</h4>
                <ul className="space-y-1.5 sm:space-y-2 text-neutral-slate list-disc pl-5 leading-relaxed">
                  <li><strong>Wallets & Purses:</strong> Place the sticker on the inside cover or a prominent card slot.</li>
                  <li><strong>Electronics:</strong> Back of laptops, tablets, or under phone cases.</li>
                  <li><strong>Keys & Bags:</strong> Attach to keychains, luggage tags, or backpack strap tags.</li>
                  <li><strong>Passports & Documents:</strong> Inside the back cover of travel documents.</li>
                </ul>
              </div>
              
              <div className="space-y-2 sm:space-y-3 bg-neutral-mist/35 p-5 sm:p-6 rounded-xl border border-neutral-mist">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  💡 Safety Meetup Recommendations:
                </h4>
                <p className="text-neutral-slate leading-relaxed">
                  When coordinating item pickups with finders, always prioritize your safety. Arrange meetups in well-lit, busy public areas such as coffee shops, shopping centers, or near transit entrances. Bringing a friend or meeting during daylight hours is highly recommended.
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
