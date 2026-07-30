"use client";

interface ConfirmRegistrationModalProps {
  name: string;
  category: string;
  brand: string;
  serial: string;
  passphrase: string;
  alternateContact: string;
  rewardType: string;
  reward: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmRegistrationModal({
  name,
  category,
  brand,
  serial,
  passphrase,
  alternateContact,
  rewardType,
  reward,
  onCancel,
  onConfirm,
}: ConfirmRegistrationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111827b3] backdrop-blur-xs animate-fade-in">
      <div className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6 animate-scale-up">
        <div className="space-y-2">
          <h3 className="text-base font-bold text-primary font-display flex items-center gap-1.5">
            📝 Review Registration Details
          </h3>
          <p className="text-xs text-neutral-slate leading-relaxed">
            Please confirm the details of your item before saving it to your account.
          </p>
        </div>

        {/* Review fields summary list */}
        <div className="border border-neutral-mist/60 rounded-xl overflow-hidden divide-y divide-neutral-mist/50 bg-neutral-mist/10 text-xs text-primary font-sans">
          <div className="flex justify-between p-3">
            <span className="text-neutral-slate font-medium">Item Name:</span>
            <span className="font-semibold">{name.trim()}</span>
          </div>
          <div className="flex justify-between p-3">
            <span className="text-neutral-slate font-medium">Category:</span>
            <span className="font-semibold">{category}</span>
          </div>
          {brand.trim() && (
            <div className="flex justify-between p-3">
              <span className="text-neutral-slate font-medium">Brand:</span>
              <span className="font-semibold">{brand.trim()}</span>
            </div>
          )}
          {serial.trim() && (
            <div className="flex justify-between p-3">
              <span className="text-neutral-slate font-medium">Serial / Model:</span>
              <span className="font-semibold">{serial.trim()}</span>
            </div>
          )}
          <div className="flex justify-between p-3">
            <span className="text-neutral-slate font-medium">Verification PIN:</span>
            <span className="font-mono font-bold text-accent">{passphrase}</span>
          </div>
          {category === "Phone" && (
            <div className="flex justify-between p-3">
              <span className="text-neutral-slate font-medium">Alternate Contact:</span>
              <span className="font-semibold">{alternateContact.trim()}</span>
            </div>
          )}
          <div className="flex justify-between p-3">
            <span className="text-neutral-slate font-medium">Reward offered:</span>
            <span className="font-semibold">
              {rewardType === "custom"
                ? reward.trim()
                : rewardType === "undisclosed"
                ? "Undisclosed"
                : "No reward"}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-neutral-slate leading-normal">
          Upon confirmation, this item will be secured in our registry. Your private security details remain private and fully protected.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="bg-neutral-mist hover:bg-neutral-mist/80 text-primary border border-gray-300 font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="bg-primary hover:bg-primary-light text-neutral-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Confirm & Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
