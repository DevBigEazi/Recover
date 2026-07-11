import { getContract } from "thirdweb";
import { client } from "./client";
import { electroneum } from "./chain";
import recoverAbiJson from "./Recover.json";

export const recoverContract = getContract({
  client,
  chain: electroneum,
  address: process.env.NEXT_PUBLIC_RECOVER_CONTRACT_ADDRESS as string,
  abi: recoverAbiJson.abi as any,
});
