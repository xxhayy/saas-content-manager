import type { AssetCategory } from "@prisma/client";

// A single entry in the app's curated asset library.
// These are platform-provided assets available to all users, distinct from
// each user's own uploaded assets. URLs point to ImageKit — replace each
// placeholder URL with the real ImageKit path once assets are uploaded.
export interface LibraryAsset {
  id: string;
  name: string;
  category: AssetCategory;
  imageUrl: string; // Full ImageKit CDN URL — replace placeholders before launch
}

export const APP_LIBRARY_ASSETS: LibraryAsset[] = [
  // ─── Furniture ───────────────────────────────────────────────────────────────
  {
    id: "lib-furniture-sofa-grey",
    name: "Modern Grey Sofa",
    category: "FURNITURE",
    imageUrl: "https://ik.imagekit.io/aironestu/library/furniture/sofa-grey.png",
  },
  {
    id: "lib-furniture-sofa-cream",
    name: "Cream Sectional Sofa",
    category: "FURNITURE",
    imageUrl: "https://ik.imagekit.io/aironestu/library/furniture/sofa-cream.png",
  },
  {
    id: "lib-furniture-armchair",
    name: "Accent Armchair",
    category: "FURNITURE",
    imageUrl: "https://ik.imagekit.io/aironestu/library/furniture/armchair.png",
  },
  {
    id: "lib-furniture-coffee-table",
    name: "Oak Coffee Table",
    category: "FURNITURE",
    imageUrl: "https://ik.imagekit.io/aironestu/library/furniture/coffee-table-oak.png",
  },
  {
    id: "lib-furniture-dining-table",
    name: "Marble Dining Table",
    category: "FURNITURE",
    imageUrl: "https://ik.imagekit.io/aironestu/library/furniture/dining-table-marble.png",
  },
  {
    id: "lib-furniture-rug-beige",
    name: "Beige Area Rug",
    category: "FURNITURE",
    imageUrl: "https://ik.imagekit.io/aironestu/library/furniture/rug-beige.png",
  },
  {
    id: "lib-furniture-rug-pattern",
    name: "Patterned Rug",
    category: "FURNITURE",
    imageUrl: "https://ik.imagekit.io/aironestu/library/furniture/rug-pattern.png",
  },
  {
    id: "lib-furniture-shelving",
    name: "Modular Shelving Unit",
    category: "FURNITURE",
    imageUrl: "https://ik.imagekit.io/aironestu/library/furniture/shelving-modular.png",
  },
  {
    id: "lib-furniture-bed-king",
    name: "King Bed Frame",
    category: "FURNITURE",
    imageUrl: "https://ik.imagekit.io/aironestu/library/furniture/bed-king.png",
  },
  {
    id: "lib-furniture-bedside-table",
    name: "Walnut Bedside Table",
    category: "FURNITURE",
    imageUrl: "https://ik.imagekit.io/aironestu/library/furniture/bedside-table-walnut.png",
  },

  // ─── Commerce / Products ─────────────────────────────────────────────────────
  {
    id: "lib-product-vase-white",
    name: "White Ceramic Vase",
    category: "COMMERCE_PRODUCT",
    imageUrl: "https://ik.imagekit.io/aironestu/library/products/vase-white-ceramic.png",
  },
  {
    id: "lib-product-vase-terracotta",
    name: "Terracotta Vase",
    category: "COMMERCE_PRODUCT",
    imageUrl: "https://ik.imagekit.io/aironestu/library/products/vase-terracotta.png",
  },
  {
    id: "lib-product-plant-monstera",
    name: "Monstera Plant",
    category: "COMMERCE_PRODUCT",
    imageUrl: "https://ik.imagekit.io/aironestu/library/products/plant-monstera.png",
  },
  {
    id: "lib-product-plant-fiddle",
    name: "Fiddle Leaf Fig",
    category: "COMMERCE_PRODUCT",
    imageUrl: "https://ik.imagekit.io/aironestu/library/products/plant-fiddle-leaf.png",
  },
  {
    id: "lib-product-floor-lamp",
    name: "Arc Floor Lamp",
    category: "COMMERCE_PRODUCT",
    imageUrl: "https://ik.imagekit.io/aironestu/library/products/lamp-arc-floor.png",
  },
  {
    id: "lib-product-pendant-lamp",
    name: "Pendant Light",
    category: "COMMERCE_PRODUCT",
    imageUrl: "https://ik.imagekit.io/aironestu/library/products/lamp-pendant.png",
  },
  {
    id: "lib-product-mirror-round",
    name: "Round Wall Mirror",
    category: "COMMERCE_PRODUCT",
    imageUrl: "https://ik.imagekit.io/aironestu/library/products/mirror-round.png",
  },
  {
    id: "lib-product-candle-set",
    name: "Candle Set",
    category: "COMMERCE_PRODUCT",
    imageUrl: "https://ik.imagekit.io/aironestu/library/products/candle-set.png",
  },
  {
    id: "lib-product-throw-pillow",
    name: "Linen Throw Pillow",
    category: "COMMERCE_PRODUCT",
    imageUrl: "https://ik.imagekit.io/aironestu/library/products/pillow-linen.png",
  },
  {
    id: "lib-product-wall-art",
    name: "Abstract Wall Art",
    category: "COMMERCE_PRODUCT",
    imageUrl: "https://ik.imagekit.io/aironestu/library/products/wall-art-abstract.png",
  },

  // ─── Avatars ─────────────────────────────────────────────────────────────────
  {
    id: "lib-avatar-female-1",
    name: "Female Model A",
    category: "AVATAR",
    imageUrl: "https://ik.imagekit.io/aironestu/library/avatars/female-model-a.png",
  },
  {
    id: "lib-avatar-female-2",
    name: "Female Model B",
    category: "AVATAR",
    imageUrl: "https://ik.imagekit.io/aironestu/library/avatars/female-model-b.png",
  },
  {
    id: "lib-avatar-male-1",
    name: "Male Model A",
    category: "AVATAR",
    imageUrl: "https://ik.imagekit.io/aironestu/library/avatars/male-model-a.png",
  },
  {
    id: "lib-avatar-male-2",
    name: "Male Model B",
    category: "AVATAR",
    imageUrl: "https://ik.imagekit.io/aironestu/library/avatars/male-model-b.png",
  },

  // ─── Men's Watches ───────────────────────────────────────────────────────────
  {
    id: "lib-watch-mens-dress",
    name: "Men's Dress Watch",
    category: "MENS_WATCH",
    imageUrl: "https://ik.imagekit.io/aironestu/library/watches/mens-dress.png",
  },
  {
    id: "lib-watch-mens-sport",
    name: "Men's Sport Watch",
    category: "MENS_WATCH",
    imageUrl: "https://ik.imagekit.io/aironestu/library/watches/mens-sport.png",
  },
  {
    id: "lib-watch-mens-chronograph",
    name: "Men's Chronograph",
    category: "MENS_WATCH",
    imageUrl: "https://ik.imagekit.io/aironestu/library/watches/mens-chronograph.png",
  },

  // ─── Women's Watches ─────────────────────────────────────────────────────────
  {
    id: "lib-watch-womens-rose-gold",
    name: "Women's Rose Gold Watch",
    category: "WOMENS_WATCH",
    imageUrl: "https://ik.imagekit.io/aironestu/library/watches/womens-rose-gold.png",
  },
  {
    id: "lib-watch-womens-bracelet",
    name: "Women's Bracelet Watch",
    category: "WOMENS_WATCH",
    imageUrl: "https://ik.imagekit.io/aironestu/library/watches/womens-bracelet.png",
  },
  {
    id: "lib-watch-womens-minimal",
    name: "Women's Minimalist Watch",
    category: "WOMENS_WATCH",
    imageUrl: "https://ik.imagekit.io/aironestu/library/watches/womens-minimal.png",
  },
];

// Returns all library assets, optionally filtered to a single category.
export function getLibraryAssets(filterCategory?: string): LibraryAsset[] {
  if (!filterCategory) return APP_LIBRARY_ASSETS;
  return APP_LIBRARY_ASSETS.filter((a) => a.category === filterCategory);
}

// Groups library assets by category — used for rendering category sections.
export function getLibraryAssetsByCategory(): Record<string, LibraryAsset[]> {
  return APP_LIBRARY_ASSETS.reduce<Record<string, LibraryAsset[]>>(
    (acc, asset) => {
      const group = acc[asset.category] ?? [];
      group.push(asset);
      acc[asset.category] = group;
      return acc;
    },
    {},
  );
}
