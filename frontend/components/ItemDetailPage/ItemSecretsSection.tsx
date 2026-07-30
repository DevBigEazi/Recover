"use client";

export interface LocalItem {
  registrationId: string;
  name: string;
  brand: string;
  serial: string;
  reward: string;
  contact: string;
  instructions: string;
  owner: string;
  ownerName?: string;
  status: "Active" | "Lost" | "Recovered";
  itemHash: string;
  registeredAt: number;
  lastUpdated: number;
  category?: string;
  alternateContact?: string;
  receiptData?: string;
  secrets?: string;
  passphrase?: string;
  rewardType?: string;
  image?: string;
  showPublicContact?: boolean;
  phone?: string;
  whatsapp?: string;
  email?: string;
  publicContactMethod?: string;
  unlockedForCurrentLostCycle?: boolean;
}

interface ItemSecretsSectionProps {
  item: LocalItem;
  isOwner: boolean;
}

export default function ItemSecretsSection({ item, isOwner }: ItemSecretsSectionProps) {
  if (!isOwner) return null;

  return (
    <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
      <div>
        <h3 className="text-lg font-bold text-primary font-display flex items-center gap-2">
          🔒 Private Security & Handover Verification
        </h3>
        <p className="text-xs text-neutral-slate mt-1">
          These details are stored privately off-chain and are only visible to you. You will use these details physically in-person to verify ownership during recovery.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs text-neutral-slate">
        {/* PIN/Passphrase */}
        <div className="bg-neutral-mist/35 border border-neutral-mist p-4 rounded-xl space-y-1">
          <span className="block font-bold text-primary uppercase tracking-wider text-[10px]">
            Handover Verification PIN
          </span>
          <span className="block text-lg font-mono font-bold text-accent">
            {item.passphrase || "Not Set"}
          </span>
          <span className="block text-[10px] text-neutral-slate leading-normal pt-1">
            Ask the finder to verify this PIN code when they meet you to hand over the item.
          </span>
        </div>

        {/* Alternate Contact */}
        <div className="bg-neutral-mist/35 border border-neutral-mist p-4 rounded-xl space-y-1">
          <span className="block font-bold text-primary uppercase tracking-wider text-[10px]">
            Trusted Alternate Contact
          </span>
          <span className="block text-sm font-semibold text-primary">
            {item.alternateContact || "None Configured"}
          </span>
          <span className="block text-[10px] text-neutral-slate leading-normal pt-1">
            Caretaker or Next of Kin contact details used to notify you if your phone is lost.
          </span>
        </div>

        {/* Secrets */}
        <div className="bg-neutral-mist/35 border border-neutral-mist p-4 rounded-xl space-y-1 md:col-span-2">
          <span className="block font-bold text-primary uppercase tracking-wider text-[10px]">
            Private Distinguishing Marks & Secrets
          </span>
          <p className="text-sm text-primary font-sans leading-relaxed">
            {item.secrets || "No private distinguishing marks or IMEI registered."}
          </p>
        </div>

        {/* Item Image Preview */}
        {item.image && (
          <div className="md:col-span-1 space-y-2 border border-neutral-mist p-4 rounded-xl bg-neutral-mist/20">
            <span className="block font-bold text-primary uppercase tracking-wider text-[10px]">
              Registered Item Image
            </span>
            <div className="relative h-40 w-full rounded-lg overflow-hidden border border-neutral-mist bg-neutral-white">
              <img
                src={item.image}
                alt="Registered item photo"
                className="object-contain w-full h-full"
              />
            </div>
          </div>
        )}

        {/* Receipt Preview */}
        {item.receiptData && (
          <div className="md:col-span-1 space-y-2 border border-neutral-mist p-4 rounded-xl bg-neutral-mist/20">
            <span className="block font-bold text-primary uppercase tracking-wider text-[10px]">
              Item Purchase Receipt
            </span>
            <div className="relative h-40 w-full rounded-lg overflow-hidden border border-neutral-mist bg-neutral-white">
              <img
                src={item.receiptData}
                alt="Item purchase receipt"
                className="object-contain w-full h-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
