import type { AssetCategory } from "@prisma/client";

// A single slot on a template — one "spot" where the user places a product/asset.
// e.g. "Sofa Area" on a living room template accepts only FURNITURE assets.
export interface TemplateSlot {
  id: string;
  label: string;
  accepts: AssetCategory[];
  required: boolean;
  description?: string;
}

// A full scene template — defines the environment, its slots, and the base AI prompt.
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: "Interior" | "Lifestyle" | "Fashion" | "Retail";
  baseImageUrl: string;
  thumbnailUrl: string;
  slots: TemplateSlot[];
  basePrompt: string;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  // ─── Interior ────────────────────────────────────────────────────────────────
  {
    id: "modern-portuguese-room",
    name: "Modern Portuguese Room",
    description: "A bright, airy Portuguese-style living room with terracotta accents",
    category: "Interior",
    baseImageUrl: "https://ik.imagekit.io/aironestu/templates/modern-portuguese-room.png",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/templates/thumbs/modern-portuguese-room.png",
    slots: [
      { id: "sofa", label: "Sofa Area", accepts: ["FURNITURE"], required: true, description: "Main seating piece" },
      { id: "coffee-table", label: "Coffee Table", accepts: ["FURNITURE"], required: false },
      { id: "wall-art", label: "Wall Art", accepts: ["COMMERCE_PRODUCT"], required: false },
      { id: "rug", label: "Rug", accepts: ["FURNITURE"], required: false },
      { id: "lighting", label: "Lighting Fixture", accepts: ["COMMERCE_PRODUCT"], required: false },
    ],
    basePrompt:
      "Generate a photorealistic interior scene of a modern Portuguese living room with warm terracotta tones, natural light from large windows, and white-washed walls. Place the provided furniture and decor items naturally within the space. Studio-quality lighting, 8K resolution.",
  },
  {
    id: "minimalist-studio",
    name: "Minimalist Studio",
    description: "Clean, all-white studio space with soft diffused lighting",
    category: "Interior",
    baseImageUrl: "https://ik.imagekit.io/aironestu/templates/minimalist-studio.png",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/templates/thumbs/minimalist-studio.png",
    slots: [
      { id: "center-piece", label: "Center Piece", accepts: ["FURNITURE", "COMMERCE_PRODUCT"], required: true, description: "Main featured item" },
      { id: "side-accent", label: "Side Accent", accepts: ["FURNITURE", "COMMERCE_PRODUCT"], required: false },
      { id: "plant", label: "Plant / Decor", accepts: ["COMMERCE_PRODUCT"], required: false },
    ],
    basePrompt:
      "Generate a photorealistic minimalist studio scene with pure white walls, polished concrete floor, and soft diffused natural lighting. Arrange the provided items cleanly with generous negative space. High-end editorial photography style, 8K resolution.",
  },
  {
    id: "industrial-loft",
    name: "Industrial Loft",
    description: "Exposed brick, steel beams, and warm Edison lighting",
    category: "Interior",
    baseImageUrl: "https://ik.imagekit.io/aironestu/templates/industrial-loft.png",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/templates/thumbs/industrial-loft.png",
    slots: [
      { id: "sofa", label: "Sofa / Seating", accepts: ["FURNITURE"], required: true },
      { id: "table", label: "Table", accepts: ["FURNITURE"], required: false },
      { id: "decor", label: "Decor / Accessory", accepts: ["COMMERCE_PRODUCT"], required: false },
    ],
    basePrompt:
      "Generate a photorealistic industrial loft interior with exposed red brick walls, raw steel ceiling beams, and warm Edison bulb lighting. Place the provided furniture and accessories naturally. Commercial interior photography quality, 8K resolution.",
  },

  // ─── Lifestyle ───────────────────────────────────────────────────────────────
  {
    id: "kitchen-counter",
    name: "Kitchen Counter",
    description: "Modern kitchen countertop scene for product lifestyle shots",
    category: "Lifestyle",
    baseImageUrl: "https://ik.imagekit.io/aironestu/templates/kitchen-counter.png",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/templates/thumbs/kitchen-counter.png",
    slots: [
      { id: "hero-product", label: "Hero Product", accepts: ["COMMERCE_PRODUCT"], required: true, description: "Primary product being featured" },
      { id: "secondary", label: "Secondary Item", accepts: ["COMMERCE_PRODUCT"], required: false },
    ],
    basePrompt:
      "Generate a photorealistic lifestyle product shot on a modern kitchen marble countertop with soft natural light from a nearby window. Place the provided products naturally with subtle props. Commercial product photography, 8K resolution.",
  },
  {
    id: "office-desk",
    name: "Office Desk",
    description: "Clean workspace setup for tech and stationery products",
    category: "Lifestyle",
    baseImageUrl: "https://ik.imagekit.io/aironestu/templates/office-desk.png",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/templates/thumbs/office-desk.png",
    slots: [
      { id: "hero-product", label: "Hero Product", accepts: ["COMMERCE_PRODUCT"], required: true },
      { id: "accessory", label: "Accessory", accepts: ["COMMERCE_PRODUCT"], required: false },
    ],
    basePrompt:
      "Generate a photorealistic lifestyle scene on a clean wooden office desk with a modern monitor, plant, and soft natural light. Feature the provided products prominently. Professional commercial photography style, 8K resolution.",
  },
  {
    id: "outdoor-patio",
    name: "Outdoor Patio",
    description: "Sun-drenched outdoor terrace for furniture and lifestyle products",
    category: "Lifestyle",
    baseImageUrl: "https://ik.imagekit.io/aironestu/templates/outdoor-patio.png",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/templates/thumbs/outdoor-patio.png",
    slots: [
      { id: "furniture", label: "Outdoor Furniture", accepts: ["FURNITURE"], required: true },
      { id: "decor", label: "Decor / Accessory", accepts: ["COMMERCE_PRODUCT"], required: false },
    ],
    basePrompt:
      "Generate a photorealistic outdoor patio scene with warm afternoon sunlight, lush greenery, and Mediterranean tiles. Place the provided furniture and accessories naturally. Architectural lifestyle photography, 8K resolution.",
  },

  // ─── Fashion ─────────────────────────────────────────────────────────────────
  {
    id: "street-scene",
    name: "Street Scene",
    description: "Urban street environment for fashion and wearable products",
    category: "Fashion",
    baseImageUrl: "https://ik.imagekit.io/aironestu/templates/street-scene.png",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/templates/thumbs/street-scene.png",
    slots: [
      { id: "model-asset", label: "Model / Avatar", accepts: ["AVATAR"], required: true, description: "Person wearing or holding the product" },
      { id: "watch", label: "Watch / Accessory", accepts: ["MENS_WATCH", "WOMENS_WATCH", "COMMERCE_PRODUCT"], required: false },
    ],
    basePrompt:
      "Generate a photorealistic urban street fashion photograph with a busy city background, natural golden-hour lighting. Feature the provided model and accessories naturally. Editorial fashion photography, 8K resolution.",
  },
  {
    id: "studio-portrait",
    name: "Studio Portrait",
    description: "Clean studio backdrop for fashion and accessory photography",
    category: "Fashion",
    baseImageUrl: "https://ik.imagekit.io/aironestu/templates/studio-portrait.png",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/templates/thumbs/studio-portrait.png",
    slots: [
      { id: "model-asset", label: "Model / Avatar", accepts: ["AVATAR"], required: true },
      { id: "watch", label: "Watch / Accessory", accepts: ["MENS_WATCH", "WOMENS_WATCH", "COMMERCE_PRODUCT"], required: false },
    ],
    basePrompt:
      "Generate a photorealistic studio portrait with a clean seamless grey backdrop and professional three-point lighting. Feature the provided model and accessories prominently. High-fashion editorial quality, 8K resolution.",
  },

  // ─── Retail ──────────────────────────────────────────────────────────────────
  {
    id: "retail-shelf",
    name: "Retail Shelf",
    description: "Retail shelving display for product packaging and merchandise",
    category: "Retail",
    baseImageUrl: "https://ik.imagekit.io/aironestu/templates/retail-shelf.png",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/templates/thumbs/retail-shelf.png",
    slots: [
      { id: "hero-product", label: "Hero Product", accepts: ["COMMERCE_PRODUCT"], required: true },
      { id: "supporting-product", label: "Supporting Product", accepts: ["COMMERCE_PRODUCT"], required: false },
    ],
    basePrompt:
      "Generate a photorealistic retail shelf display with clean white shelving, bright even lighting, and tasteful product arrangement. Feature the provided products prominently. Commercial retail photography, 8K resolution.",
  },
  {
    id: "window-display",
    name: "Window Display",
    description: "Storefront window display for high-impact product showcasing",
    category: "Retail",
    baseImageUrl: "https://ik.imagekit.io/aironestu/templates/window-display.png",
    thumbnailUrl: "https://ik.imagekit.io/aironestu/templates/thumbs/window-display.png",
    slots: [
      { id: "hero-product", label: "Hero Product", accepts: ["COMMERCE_PRODUCT", "FURNITURE"], required: true },
      { id: "accent", label: "Accent Piece", accepts: ["COMMERCE_PRODUCT"], required: false },
    ],
    basePrompt:
      "Generate a photorealistic luxury storefront window display with dramatic spotlighting, elegant props, and a premium brand aesthetic. Feature the provided products as the focal point. Luxury retail visual merchandising photography, 8K resolution.",
  },
];

// Groups templates by their category — used by the template picker dialog to render sections.
export function getTemplatesByCategory(): Record<string, ProjectTemplate[]> {
  return PROJECT_TEMPLATES.reduce<Record<string, ProjectTemplate[]>>((acc, template) => {
    const group = acc[template.category] ?? [];
    group.push(template);
    acc[template.category] = group;
    return acc;
  }, {});
}

// Finds a single template by id. Returns undefined if not found.
export function getTemplateById(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((t) => t.id === id);
}

// Builds the final prompt + image input list to send to kie.ai.
// slotConnections maps slot.id → image URL of the connected Reference Node.
export function buildTemplatePrompt(
  template: ProjectTemplate,
  slotConnections: Record<string, string>,
  promptModifier?: string,
): { prompt: string; imageInputs: string[] } {
  const imageInputs: string[] = [];
  const slotDescriptions: string[] = [];

  for (const slot of template.slots) {
    const imageUrl = slotConnections[slot.id];
    if (imageUrl) {
      imageInputs.push(imageUrl);
      slotDescriptions.push(`Place the provided ${slot.label} image into the ${slot.label} position of the scene.`);
    }
  }

  const slotInstructions = slotDescriptions.length > 0
    ? ` ${slotDescriptions.join(" ")}`
    : "";

  const modifier = promptModifier?.trim()
    ? ` Additional direction: ${promptModifier.trim()}`
    : "";

  return {
    prompt: `${template.basePrompt}${slotInstructions}${modifier}`,
    imageInputs,
  };
}
