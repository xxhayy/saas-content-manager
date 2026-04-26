import type { AssetCategory } from "@prisma/client";

// A single interactive element within a spatial scene environment.
// Each element corresponds to a distinct colored region in the annotated image
// that kie.ai uses to identify where to place the user's reference asset.
export interface SpatialElement {
  id: string;
  label: string;               // Fixed, read-only — shown on slot handles and View dialog pins
  color: string;               // Hex color of this element's outlined region in annotatedImageUrl
  accepts: AssetCategory[];    // Which asset categories are valid for this slot
  pinPosition: {               // Percentage coordinates (0–100) on the clean image
    x: number;                 // for the interactive + button in the View dialog
    y: number;
  };
  description?: string;        // Optional helper text shown on pin hover
}

// A full spatial scene — an environment with named, color-coded regions.
// thumbnailUrl is shown to users. annotatedImageUrl is sent to kie.ai only.
export interface SpatialScene {
  id: string;
  name: string;
  description: string;
  category: "Real Estate" | "Automotive" | "Showroom" | "Retail";
  thumbnailUrl: string;       // Clean photorealistic scene — shown in node card and View dialog
  annotatedImageUrl: string;  // Same scene with colored element outlines — sent to kie.ai, never shown to user
  elements: SpatialElement[];
  basePrompt: string;
}

export const SPATIAL_SCENES: SpatialScene[] = [
  // ─── Real Estate ─────────────────────────────────────────────────────────────
  {
    id: "modern-living-room",
    name: "Modern Living Room",
    description: "Bright contemporary living room with large windows and neutral tones",
    category: "Real Estate",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/spatial/modern-living-room.png",
    annotatedImageUrl: "https://ik.imagekit.io/aironestu/spatial/annotated/modern-living-room-annotated.png",
    elements: [
      {
        id: "sofa",
        label: "Sofa",
        color: "#4ade80",
        accepts: ["FURNITURE"],
        pinPosition: { x: 28, y: 62 },
        description: "Main seating piece — sofa or sectional",
      },
      {
        id: "coffee-table",
        label: "Coffee Table",
        color: "#60a5fa",
        accepts: ["FURNITURE"],
        pinPosition: { x: 50, y: 74 },
        description: "Central table in front of the sofa",
      },
      {
        id: "rug",
        label: "Rug",
        color: "#f87171",
        accepts: ["FURNITURE"],
        pinPosition: { x: 50, y: 82 },
        description: "Floor rug under the seating area",
      },
      {
        id: "accent-chair",
        label: "Accent Chair",
        color: "#fb923c",
        accepts: ["FURNITURE"],
        pinPosition: { x: 72, y: 60 },
        description: "Side chair or lounge seat",
      },
      {
        id: "lighting",
        label: "Floor Lamp",
        color: "#e879f9",
        accepts: ["COMMERCE_PRODUCT"],
        pinPosition: { x: 82, y: 45 },
        description: "Standing or arc floor lamp",
      },
    ],
    basePrompt:
      "Generate a photorealistic interior scene of a modern living room with large windows, clean neutral walls, and natural light. Replace each color-highlighted region with the corresponding provided reference asset, placing each item naturally and proportionally in the space. Maintain photorealistic lighting, shadows, and perspective. 8K resolution, architectural photography style.",
  },
  {
    id: "master-bedroom",
    name: "Master Bedroom",
    description: "Elegant master bedroom with built-in wardrobe and soft lighting",
    category: "Real Estate",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/spatial/master-bedroom.png",
    annotatedImageUrl: "https://ik.imagekit.io/aironestu/spatial/annotated/master-bedroom-annotated.png",
    elements: [
      {
        id: "bed",
        label: "Bed Frame & Headboard",
        color: "#4ade80",
        accepts: ["FURNITURE"],
        pinPosition: { x: 50, y: 55 },
        description: "Main bed — king or queen",
      },
      {
        id: "bedside-table",
        label: "Bedside Table",
        color: "#60a5fa",
        accepts: ["FURNITURE"],
        pinPosition: { x: 22, y: 62 },
        description: "Nightstand beside the bed",
      },
      {
        id: "wardrobe",
        label: "Wardrobe",
        color: "#f87171",
        accepts: ["FURNITURE"],
        pinPosition: { x: 84, y: 45 },
        description: "Built-in or freestanding wardrobe",
      },
      {
        id: "pendant-light",
        label: "Pendant / Bedside Lamp",
        color: "#fbbf24",
        accepts: ["COMMERCE_PRODUCT"],
        pinPosition: { x: 22, y: 48 },
        description: "Hanging pendant or table lamp",
      },
    ],
    basePrompt:
      "Generate a photorealistic master bedroom interior with soft ambient lighting, plush textiles, and a calm, luxurious atmosphere. Replace each color-highlighted region with the corresponding provided reference asset, maintaining natural scale and room proportions. 8K resolution, interior design photography style.",
  },

  // ─── Automotive ──────────────────────────────────────────────────────────────
  {
    id: "luxury-car-interior",
    name: "Luxury Car Interior",
    description: "High-end vehicle cabin — seats, dashboard, and center console",
    category: "Automotive",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/spatial/luxury-car-interior.png",
    annotatedImageUrl: "https://ik.imagekit.io/aironestu/spatial/annotated/luxury-car-interior-annotated.png",
    elements: [
      {
        id: "front-seat",
        label: "Front Seat Upholstery",
        color: "#4ade80",
        accepts: ["COMMERCE_PRODUCT"],
        pinPosition: { x: 30, y: 60 },
        description: "Driver and passenger seat material or color",
      },
      {
        id: "steering-wheel",
        label: "Steering Wheel",
        color: "#60a5fa",
        accepts: ["COMMERCE_PRODUCT"],
        pinPosition: { x: 22, y: 48 },
        description: "Steering wheel trim or replacement",
      },
      {
        id: "dashboard-trim",
        label: "Dashboard Trim",
        color: "#f87171",
        accepts: ["COMMERCE_PRODUCT"],
        pinPosition: { x: 55, y: 42 },
        description: "Dashboard panel material or accent",
      },
      {
        id: "center-console",
        label: "Center Console",
        color: "#fb923c",
        accepts: ["COMMERCE_PRODUCT"],
        pinPosition: { x: 52, y: 65 },
        description: "Center console finish or accessory",
      },
    ],
    basePrompt:
      "Generate a photorealistic luxury vehicle interior photograph. Replace each color-highlighted region with the corresponding provided reference asset, matching the curvature and perspective of the original surface exactly. Use professional automotive photography lighting — dramatic studio light with subtle reflections. 8K resolution.",
  },
  {
    id: "car-dealership-showroom",
    name: "Car Dealership Showroom",
    description: "Open showroom floor with spotlit vehicle bays and polished concrete",
    category: "Automotive",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/spatial/car-dealership-showroom.png",
    annotatedImageUrl: "https://ik.imagekit.io/aironestu/spatial/annotated/car-dealership-showroom-annotated.png",
    elements: [
      {
        id: "primary-vehicle",
        label: "Primary Vehicle",
        color: "#4ade80",
        accepts: ["COMMERCE_PRODUCT"],
        pinPosition: { x: 40, y: 60 },
        description: "Hero car on the main showroom platform",
      },
      {
        id: "secondary-vehicle",
        label: "Secondary Vehicle",
        color: "#60a5fa",
        accepts: ["COMMERCE_PRODUCT"],
        pinPosition: { x: 75, y: 65 },
        description: "Supporting vehicle in the background bay",
      },
      {
        id: "reception-desk",
        label: "Reception Desk",
        color: "#f87171",
        accepts: ["FURNITURE"],
        pinPosition: { x: 15, y: 55 },
        description: "Front desk or sales counter",
      },
    ],
    basePrompt:
      "Generate a photorealistic automotive dealership showroom scene with dramatic overhead spotlights, polished concrete flooring, and glass walls. Replace each color-highlighted region with the corresponding provided reference asset at accurate scale and perspective. Commercial automotive photography quality, 8K resolution.",
  },

  // ─── Showroom ─────────────────────────────────────────────────────────────────
  {
    id: "furniture-showroom",
    name: "Furniture Showroom",
    description: "Open-plan furniture showroom with vignette lighting and lifestyle staging",
    category: "Showroom",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/spatial/furniture-showroom.png",
    annotatedImageUrl: "https://ik.imagekit.io/aironestu/spatial/annotated/furniture-showroom-annotated.png",
    elements: [
      {
        id: "sofa-display",
        label: "Feature Sofa",
        color: "#4ade80",
        accepts: ["FURNITURE"],
        pinPosition: { x: 35, y: 60 },
        description: "Hero sofa on the central display platform",
      },
      {
        id: "dining-table",
        label: "Dining Table Set",
        color: "#60a5fa",
        accepts: ["FURNITURE"],
        pinPosition: { x: 72, y: 58 },
        description: "Dining table and chairs in the adjacent vignette",
      },
      {
        id: "wall-unit",
        label: "Wall Unit / Shelving",
        color: "#f87171",
        accepts: ["FURNITURE"],
        pinPosition: { x: 88, y: 45 },
        description: "Back-wall shelving or entertainment unit",
      },
      {
        id: "decor-accessory",
        label: "Decor Accessory",
        color: "#fbbf24",
        accepts: ["COMMERCE_PRODUCT"],
        pinPosition: { x: 50, y: 50 },
        description: "Vase, sculpture, or decorative object",
      },
    ],
    basePrompt:
      "Generate a photorealistic furniture showroom scene with warm vignette lighting, lifestyle staging, and polished floors. Replace each color-highlighted region with the corresponding provided reference asset at accurate display proportions. High-end furniture catalogue photography, 8K resolution.",
  },

  // ─── Retail ──────────────────────────────────────────────────────────────────
  {
    id: "boutique-fashion-store",
    name: "Boutique Fashion Store",
    description: "Upscale clothing boutique with rack displays and fitting area",
    category: "Retail",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/spatial/boutique-fashion-store.png",
    annotatedImageUrl: "https://ik.imagekit.io/aironestu/spatial/annotated/boutique-fashion-store-annotated.png",
    elements: [
      {
        id: "clothing-rack",
        label: "Clothing Rack",
        color: "#4ade80",
        accepts: ["COMMERCE_PRODUCT"],
        pinPosition: { x: 25, y: 55 },
        description: "Main garment display rack",
      },
      {
        id: "mannequin",
        label: "Mannequin Display",
        color: "#60a5fa",
        accepts: ["AVATAR", "COMMERCE_PRODUCT"],
        pinPosition: { x: 55, y: 50 },
        description: "Hero mannequin or styled display figure",
      },
      {
        id: "display-table",
        label: "Display Table",
        color: "#f87171",
        accepts: ["FURNITURE", "COMMERCE_PRODUCT"],
        pinPosition: { x: 78, y: 65 },
        description: "Folded garments or accessory display table",
      },
      {
        id: "wall-shelf",
        label: "Wall Shelf",
        color: "#fb923c",
        accepts: ["COMMERCE_PRODUCT"],
        pinPosition: { x: 88, y: 38 },
        description: "Accessories or featured product shelf",
      },
    ],
    basePrompt:
      "Generate a photorealistic upscale boutique fashion store interior with warm accent lighting, white walls, and polished herringbone floors. Replace each color-highlighted region with the corresponding provided reference asset at accurate retail display scale. High-end fashion retail photography, 8K resolution.",
  },
  {
    id: "jewelry-store",
    name: "Jewelry Store",
    description: "Luxury jewelry boutique with glass display cases and accent lighting",
    category: "Retail",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/spatial/jewelry-store.png",
    annotatedImageUrl: "https://ik.imagekit.io/aironestu/spatial/annotated/jewelry-store-annotated.png",
    elements: [
      {
        id: "main-display-case",
        label: "Main Display Case",
        color: "#4ade80",
        accepts: ["MENS_WATCH", "WOMENS_WATCH", "COMMERCE_PRODUCT"],
        pinPosition: { x: 40, y: 65 },
        description: "Primary glass counter — watches, rings, necklaces",
      },
      {
        id: "wall-display",
        label: "Wall Display Panel",
        color: "#60a5fa",
        accepts: ["MENS_WATCH", "WOMENS_WATCH", "COMMERCE_PRODUCT"],
        pinPosition: { x: 78, y: 45 },
        description: "Backlit wall-mounted product display",
      },
      {
        id: "hero-piece",
        label: "Hero Piece Pedestal",
        color: "#f87171",
        accepts: ["MENS_WATCH", "WOMENS_WATCH", "COMMERCE_PRODUCT"],
        pinPosition: { x: 20, y: 58 },
        description: "Elevated single-item spotlight display",
      },
    ],
    basePrompt:
      "Generate a photorealistic luxury jewelry boutique scene with dramatic spotlighting, marble floors, and glass display cases. Replace each color-highlighted region with the corresponding provided reference asset, rendered with jewellery-grade lighting to show material quality. High-end luxury retail photography, 8K resolution.",
  },
];

// Groups scenes by their category — used by the scene picker dialog.
export function getSpatialScenesByCategory(): Record<string, SpatialScene[]> {
  return SPATIAL_SCENES.reduce<Record<string, SpatialScene[]>>((acc, scene) => {
    const group = acc[scene.category] ?? [];
    group.push(scene);
    acc[scene.category] = group;
    return acc;
  }, {});
}

// Finds a single scene by id.
export function getSpatialSceneById(id: string): SpatialScene | undefined {
  return SPATIAL_SCENES.find((s) => s.id === id);
}

// Builds the final prompt and image input array for kie.ai.
// effectiveConnections: merged result of directSlotPicks + edge-based slotConnections.
// Only elements that have a connected asset are included — empty slots are silently skipped.
export function buildSpatialPrompt(
  scene: SpatialScene,
  effectiveConnections: Record<string, string>, // element.id → asset image URL
): { prompt: string; imageInputs: string[] } {
  const imageInputs: string[] = [];
  const placementInstructions: string[] = [];

  // The annotated image is always the first input — it gives kie.ai the spatial map
  imageInputs.push(scene.annotatedImageUrl);

  scene.elements.forEach((element, index) => {
    const assetUrl = effectiveConnections[element.id];
    if (!assetUrl) return; // slot is empty — skip entirely, no instruction emitted

    imageInputs.push(assetUrl);
    // Reference by image index (1-based after the annotated map) so the AI
    // can correlate each instruction to the correct provided reference image.
    const refIndex = index + 2; // +1 for 1-base, +1 to skip the annotated map at position 1
    placementInstructions.push(
      `Replace the ${element.color} colored region (${element.label}) with reference image ${refIndex}.`,
    );
  });

  const instructions =
    placementInstructions.length > 0
      ? ` ${placementInstructions.join(" ")}`
      : "";

  return {
    prompt: `${scene.basePrompt}${instructions}`,
    imageInputs,
  };
}
