"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReceiptsPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/workspace?tab=receipts");
  }, [router]);

  return null;
}
