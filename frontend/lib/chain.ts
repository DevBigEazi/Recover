import { defineChain } from "thirdweb/chains";

export const electroneum = defineChain({
  id: 52014,
  rpc: `https://rpc.ankr.com/electroneum/${process.env.ANKR_API_KEY}`,
  nativeCurrency: { name: "Electroneum", symbol: "ETN", decimals: 18 },
  blockExplorers: [
    {
      name: "Electroneum Explorer",
      url: "https://blockexplorer.electroneum.com",
    },
  ],
});

export function isRealTxHash(hash?: string | null): boolean {
  if (!hash) return false;
  if (hash.startsWith("0xsimulated_") || hash.startsWith("0xtest_")) return false;
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}
