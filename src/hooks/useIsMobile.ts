"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect if the current viewport is in mobile size (< 768px)
 * @returns boolean - true if viewport width is less than 768px, false otherwise
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [hasMounted, setHasMounted] = useState<boolean>(false);

  useEffect(() => {
    // Set mounted flag to prevent hydration mismatch
    setHasMounted(true);

    // Check initial size
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();

    // Listen to window resize
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Return false during SSR to prevent hydration mismatch
  if (!hasMounted) return false;

  return isMobile;
}
