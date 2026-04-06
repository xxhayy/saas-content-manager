import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { AssetCard } from "@/components/assets/asset-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/server/db";
import { getSession } from "@/server/better-auth/server";
import { redirect } from "next/navigation";

export default async function AssetsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const assets = await db.asset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const furniture = assets.filter((a) => a.category === "FURNITURE");
  const commerce = assets.filter((a) => a.category === "COMMERCE_PRODUCT");
  const avatars = assets.filter((a) => a.category === "AVATAR");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Assets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your creative components across projects
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/assets/new">
            <Button className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-sm">
              <Plus className="size-4 mr-2" />
              New Asset
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl w-fit">
            <TabsTrigger value="all" className="rounded-lg px-4">All Assets</TabsTrigger>
            <TabsTrigger value="FURNITURE" className="rounded-lg px-4">Furniture</TabsTrigger>
            <TabsTrigger value="COMMERCE_PRODUCT" className="rounded-lg px-4">Commerce</TabsTrigger>
            <TabsTrigger value="AVATAR" className="rounded-lg px-4">Avatars</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
              <Input
                type="text"
                placeholder="Search assets..."
                className="w-full lg:w-[280px] rounded-xl border border-border bg-card/50 pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all"
              />
            </div>
          </div>
        </div>

        <TabsContent value="all" className="mt-0 outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="FURNITURE" className="mt-0 outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {furniture.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="COMMERCE_PRODUCT" className="mt-0 outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {commerce.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="AVATAR" className="mt-0 outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {avatars.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
