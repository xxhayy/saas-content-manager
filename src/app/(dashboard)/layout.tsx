import "@/styles/globals.css";

import { type Metadata } from "next";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { MobileSidebarWrapper } from "@/components/mobile-sidebar-wrapper";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import BreadcrumbPageClient from "@/components/sidebar/breadcrumb-page-client";

export const metadata: Metadata = {
  title: "AirOne Studio",
  description: "All in one content manager",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Providers>
      <SidebarProvider>
        <MobileSidebarWrapper />
        <SidebarInset className="bg-sidebar p-0 md:p-2 overflow-hidden flex flex-col h-screen w-full">
          <div className="flex flex-1 flex-col overflow-hidden bg-background md:border md:border-border/40 md:rounded-xl md:shadow-sm relative">
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/40 bg-background/60 backdrop-blur-xl sticky top-0 z-10 px-4">
              <div className="flex items-center h-full">
                <SidebarTrigger className="-ml-1 h-8 w-8 transition-colors" />
                <Separator
                  orientation="vertical"
                  className="mx-2 h-full opacity-50"
                />
              </div>
              <Breadcrumb className="ml-1">
                <BreadcrumbList>
                    <BreadcrumbPageClient />
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-linear-to-br from-background to-muted/20 pt-0 px-4 pb-4 md:p-6 w-full">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </Providers>
  );
}