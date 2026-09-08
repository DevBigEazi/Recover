"use client";

interface SessionAndDangerCardProps {
  walletAddress: string;
}

export default function SessionAndDangerCard({ walletAddress }: SessionAndDangerCardProps) {
  return (
    <>
      {/* 3. Linked Session & Accounts Info */}
      <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-primary font-display">Linked Session Info</h2>
        <div className="border border-neutral-mist rounded-xl p-4 space-y-2.5 text-xs text-neutral-slate bg-neutral-mist/20">
          <div className="flex justify-between">
            <span className="font-medium text-primary">Account ID:</span>
            <span className="font-mono text-primary font-semibold break-all text-right max-w-50 sm:max-w-xs">
              {walletAddress}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-primary">Session Status:</span>
            <span className="text-green-600 font-semibold uppercase tracking-wider text-[10px]">Active</span>
          </div>
        </div>
      </div>

      {/* 4. Danger Zone */}
      <div className="bg-neutral-white border border-red-100 rounded-2xl p-6 sm:p-8 shadow-xs border-t-4 border-t-red-500 space-y-4">
        <h2 className="text-lg font-bold text-red-600 font-display">Danger Zone</h2>
        <p className="text-xs text-neutral-slate">
          Once you delete or reset your profile credentials, the action is irreversible. All physical stickers registered under this profile ID will lose their display names.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => alert("Please contact Recover Support at support@recover.platform to request full account data deletion.")}
            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold rounded-lg px-5 py-2.5 text-xs transition-colors cursor-pointer"
          >
            Reset Profile Data
          </button>
        </div>
      </div>
    </>
  );
}
