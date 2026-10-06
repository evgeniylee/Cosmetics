"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { captureAttribution, track } from "@/lib/analytics";

export function Attribution() {
  const pathname = usePathname();
  useEffect(() => captureAttribution(), []);
  useEffect(() => track("page_view", { path: pathname }), [pathname]);
  return null;
}
