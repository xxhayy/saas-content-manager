import {
  RiArrowRightLine,
  RiImageLine,
  RiTimeLine,
  RiSparklingLine,
  RiArrowUpLine,
  RiFolderLine,
  RiLayoutGridLine,
} from "@remixicon/react";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { auth } from "@/server/better-auth/config";
import { db } from "@/server/db";
import { redirect } from "next/navigation";

const stats = [
  { label: "Total Projects", value: "24", icon: RiFolderLine, change: "+3 this week" },
  { label: "Assets", value: "142", icon: RiImageLine, change: "+18 this month" },
  { label: "Gallery Items", value: "87", icon: RiLayoutGridLine, change: "+5 today" },
  { label: "Recent Activity", value: "9", icon: RiTimeLine, change: "last 24h" },
];

const statusColors: Record<string, string> = {
  PROCESSING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  FAILED: "bg-destructive/10 text-destructive border-destructive/20",
};

export default async function DashboardPage() {
  const headerPayload = await headers();
  const session = await auth.api.getSession({ headers: headerPayload });

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const recentAssets = await db.asset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Welcome Header */}
      <div className="flex items-start gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
          <RiSparklingLine className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back to AirOne Studio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your projects today.
          </p>
        </div>
      </div>

      {/* Stats Grid placeholders */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card/40 p-5 space-y-3 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </span>
              <stat.icon className="size-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold text-foreground">
              {stat.value}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-500/90">
              <RiArrowUpLine className="size-3" />
              {stat.change}
            </div>
          </div>
        ))}
      </div>

       {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/projects/new"
            className="group flex flex-col items-start gap-4 rounded-3xl border border-border bg-card/40 p-6 hover:bg-accent/40 hover:border-sidebar-primary/20 transition-all duration-300 backdrop-blur-sm shadow-sm"
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/10 group-hover:bg-primary/20 transition-colors">
              <RiFolderLine className="size-6 text-primary" />
            </div>
            <div className="flex-1 w-full flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-foreground">New Project</p>
                <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
                  Start a new creative project and automate your workflow.
                </p>
              </div>
              <RiArrowRightLine className="size-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
          <Link
            href="/dashboard/assets/new"
            className="group flex flex-col items-start gap-4 rounded-3xl border border-border bg-card/40 p-6 hover:bg-accent/40 hover:border-sidebar-primary/20 transition-all duration-300 backdrop-blur-sm shadow-sm"
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/10 group-hover:bg-primary/20 transition-colors">
              <RiImageLine className="size-6 text-primary" />
            </div>
            <div className="flex-1 w-full flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-foreground">New Asset</p>
                <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
                  Upload source images for AI white-background extraction.
                </p>
              </div>
              <RiArrowRightLine className="size-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Recent Assets / Activity Section */}
        <div className="lg:col-span-12 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <Link
              href="/dashboard/assets"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              View all
              <RiArrowRightLine className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm divide-y divide-border/30 overflow-hidden shadow-sm">
            {recentAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center italic text-muted-foreground/60 p-5">
                <RiImageLine className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">No activity recorded yet.</p>
              </div>
            ) : (
              recentAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center gap-4 px-5 py-4 bg-transparent hover:bg-accent/30 transition-colors"
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-muted border border-border/50 flex items-center justify-center group shadow-sm">
                    {asset.cleanUrl || asset.originalUrl ? (
                      <Image
                        src={asset.cleanUrl ?? asset.originalUrl}
                        alt={asset.name ?? "Asset"}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <RiImageLine className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {asset.name ?? "Cleaned Asset"}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-tight mt-0.5">
                      Updated {new Date(asset.createdAt).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 px-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold tracking-tight uppercase ${statusColors[asset.status as keyof typeof statusColors] ?? "bg-muted"}`}
                    >
                      {asset.status.replace("_", " ")}
                    </span>
                    {asset.status === "PROCESSING" && (
                       <RiTimeLine className="size-4 text-amber-500 animate-pulse" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
