"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ShipmentsPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/workspace?tab=shipments");
  }, [router]);

  return null;
}
