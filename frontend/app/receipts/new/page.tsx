"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewReceiptPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/workspace?tab=pos");
  }, [router]);

  return null;
}
