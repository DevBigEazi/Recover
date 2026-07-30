"use client";

interface ContactPrivacySectionProps {
  keepPrivate: boolean;
  setKeepPrivate: (val: boolean) => void;
  contactMethod: "phone" | "whatsapp" | "email";
  setContactMethod: (val: "phone" | "whatsapp" | "email") => void;
  singleContactValue: string;
  setSingleContactValue: (val: string) => void;
}

export default function ContactPrivacySection({
  keepPrivate,
  setKeepPrivate,
  contactMethod,
  setContactMethod,
  singleContactValue,
  setSingleContactValue,
}: ContactPrivacySectionProps) {
  return (
    <div className="sm:col-span-6 p-4 bg-neutral-mist/40 border border-neutral-mist rounded-xl space-y-3">
      <label className="block font-bold text-sm text-primary">
        Contact Privacy Preference
      </label>

      <div className="space-y-2">
        {/* Option 1: Keep Private */}
        <div
          onClick={() => setKeepPrivate(true)}
          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
            keepPrivate
              ? "bg-neutral-white border-accent shadow-xs"
              : "bg-neutral-mist/30 border-gray-200 hover:bg-neutral-mist/50"
          }`}
        >
          <input
            type="radio"
            id="reg_privacy_private"
            name="reg_privacy_mode"
            checked={keepPrivate}
            onChange={() => setKeepPrivate(true)}
            className="mt-0.5 text-accent focus:ring-accent cursor-pointer"
          />
          <label htmlFor="reg_privacy_private" className="cursor-pointer space-y-0.5">
            <span className="block font-semibold text-xs text-primary">
              🛡️ Keep Contact Details Private (Recommended)
            </span>
            <span className="block text-[11px] text-neutral-slate leading-relaxed">
              Finders send messages directly to your dashboard. Your phone and email are hidden from public QR scans.
            </span>
          </label>
        </div>

        {/* Option 2: Reveal Direct Contact */}
        <div
          onClick={() => setKeepPrivate(false)}
          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
            !keepPrivate
              ? "bg-neutral-white border-accent shadow-xs"
              : "bg-neutral-mist/30 border-gray-200 hover:bg-neutral-mist/50"
          }`}
        >
          <input
            type="radio"
            id="reg_privacy_public"
            name="reg_privacy_mode"
            checked={!keepPrivate}
            onChange={() => setKeepPrivate(false)}
            className="mt-0.5 text-accent focus:ring-accent cursor-pointer"
          />
          <label htmlFor="reg_privacy_public" className="cursor-pointer space-y-0.5">
            <span className="block font-semibold text-xs text-primary">
              📞 Reveal Direct Contact Button to Finders
            </span>
            <span className="block text-[11px] text-neutral-slate leading-relaxed">
              Finders scanning your item's QR sticker will see a direct Call, WhatsApp, or Email button.
            </span>
          </label>
        </div>
      </div>

      {!keepPrivate && (
        <div className="pt-3 border-t border-neutral-mist space-y-3 animate-fade-in">
          <div>
            <label className="block font-semibold text-primary mb-1.5 text-xs">
              Select Contact Method to Reveal (Only 1 Allowed)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setContactMethod("phone")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  contactMethod === "phone"
                    ? "bg-primary text-white border-primary"
                    : "bg-neutral-white text-primary border-gray-300 hover:bg-neutral-mist"
                }`}
              >
                <span>📞 Phone Call</span>
              </button>
              <button
                type="button"
                onClick={() => setContactMethod("whatsapp")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  contactMethod === "whatsapp"
                    ? "bg-[#25D366] text-white border-[#25D366]"
                    : "bg-neutral-white text-primary border-gray-300 hover:bg-neutral-mist"
                }`}
              >
                <span>💬 WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setContactMethod("email")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  contactMethod === "email"
                    ? "bg-primary text-white border-primary"
                    : "bg-neutral-white text-primary border-gray-300 hover:bg-neutral-mist"
                }`}
              >
                <span>✉️ Email</span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="reg_single_contact_input" className="block font-semibold text-primary mb-1 text-xs">
              {contactMethod === "phone" && "Public Phone Number (For Calls)"}
              {contactMethod === "whatsapp" && "Public WhatsApp Number"}
              {contactMethod === "email" && "Public Email Address"}
            </label>
            <input
              type={contactMethod === "email" ? "email" : "text"}
              id="reg_single_contact_input"
              value={singleContactValue}
              onChange={(e) => setSingleContactValue(e.target.value)}
              placeholder={
                contactMethod === "email"
                  ? "e.g. owner@example.com"
                  : "e.g. +234 814 599 1080"
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-accent focus:outline-hidden bg-neutral-white font-mono"
            />
            <p className="text-[10px] text-neutral-slate mt-1">
              Finders scanning your QR sticker when lost will see only this selected contact button.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
