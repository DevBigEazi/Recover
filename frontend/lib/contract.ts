import { getContract } from "thirdweb";
import type { Abi } from "abitype";
import { client } from "./client";
import { electroneum } from "./chain";
import recoverAbiJson from "./Recover.json";

const defaultContractAddress = "0x67648938d99bd1809987F18a09f427D8da6C88fd";
const contractAddress = (process.env.NEXT_PUBLIC_RECOVER_CONTRACT_ADDRESS?.trim() || defaultContractAddress);

export const recoverContract = getContract({
  client,
  chain: electroneum,
  address: contractAddress,
  abi: recoverAbiJson.abi as unknown as Abi,
});
