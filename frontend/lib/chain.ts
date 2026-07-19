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
