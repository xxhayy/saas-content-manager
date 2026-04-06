"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbPage, 
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  assets: "Assets",
  gallery: "Gallery",
  new: "New",
};

export default function BreadcrumbPageClient() {
  const pathname = usePathname();
  
  // Split path and filter out empty segments
  const segments = pathname.split("/").filter(Boolean);
  
  return (
    <>
      {segments.map((seg, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        const label = labelMap[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);

        return (
          <React.Fragment key={href}>
            <BreadcrumbItem>
              {isLast ? (
                <BreadcrumbPage className="text-foreground text-sm font-medium">
                  {label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={href} className="text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!isLast && <BreadcrumbSeparator />}
          </React.Fragment>
        );
      })}
    </>
  );
}