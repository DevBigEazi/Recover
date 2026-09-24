"use client";

interface SessionCardProps {
  walletAddress: string;
}

export default function SessionCard({ walletAddress }: SessionCardProps) {
  return (
    <>
      {/* 3. Linked Session & Accounts Info */}
      <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-2 sm:p-8 shadow-xs space-y-4">
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
    </>
  );
}
