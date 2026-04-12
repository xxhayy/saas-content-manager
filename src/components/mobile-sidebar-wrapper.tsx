"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { useSidebar } from "@/components/ui/sidebar";

/**
 * Mobile-aware wrapper for AppSidebar
 * Automatically closes the sidebar on mobile when the pathname changes
 */
export function MobileSidebarWrapper() {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  return <AppSidebar />;
}
