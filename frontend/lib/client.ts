import { createThirdwebClient } from "thirdweb";

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "recover_fallback_client_id";

export const client = createThirdwebClient({
  clientId: clientId,
});
