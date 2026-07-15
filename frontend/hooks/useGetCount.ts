import { useActiveWalletChain, useReadContract } from "thirdweb/react";
import { defineChain, getContract } from "thirdweb";
import { client } from "@/lib/client";
import { CONTRACTS } from "@/constants/helpers";
import { useMemo } from "react";

export const useGetCounter = () => {
  const activeChain = useActiveWalletChain();
  const chainId = activeChain?.id || 5201420; // Fallback to testnet if wallet is not connected

  // Memoize network and address calculation
  const network = useMemo(() => 
    chainId === 52014 ? "mainnet" : "testnet", 
    [chainId]
  );
  
  const contractAddress = useMemo(() => 
    CONTRACTS[network], 
    [network]
  );

  // Define the chain object
  const chain = useMemo(() => 
    defineChain(chainId === 52014 ? 52014 : 5201420), 
    [chainId]
  );

  // Define the contract object
  const contract = useMemo(() => 
    getContract({
      client,
      chain,
      address: contractAddress,
    }),
    [chain, contractAddress]
  );

  // Read count
  const { data: rawCount, isLoading, error, refetch } = useReadContract({
    contract,
    method: "function getCount() view returns (uint256)",
    params: [],
  });

  const count = useMemo<bigint | undefined>(() => 
    typeof rawCount === "bigint" ? rawCount : undefined,
    [rawCount]
  );

  return useMemo(() => ({
    count,
    isLoading,
    error,
    refetch,
    network,
    contract,
  }), [count, isLoading, error, refetch, network, contract]);
};
