/**
 * Inspiration catalog sourced from VoltAgent/awesome-claude-design.
 * Each entry maps to a real DESIGN.md at
 *   https://getdesign.md/design-md/<slug>/DESIGN.md
 *
 * The Design agent receives 2–3 relevant inspirations per turn based on
 * keyword matches against the user's prompt — used as reference, not clone.
 */

export type InspirationCategory =
  | "ai-llm"
  | "devtools"
  | "backend-devops"
  | "productivity-saas"
  | "design-creative"
  | "fintech"
  | "ecommerce"
  | "media-consumer"
  | "automotive";

/**
 * Aesthetic families from awesome-claude-design. Category = what the product
 * DOES (fintech, devtools). Family = how it LOOKS. Keeping them separate lets
 * the matcher weight either axis; by default we match on category for
 * domain fit + show family in the Design agent's message so it knows which
 * visual vocabulary each reference brings.
 */
export type AestheticFamily =
  | "editorial-minimalism"
  | "terminal-core"
  | "warm-editorial"
  | "data-dense-pro"
  | "cinematic-dark"
  | "playful-color"
  | "glass-soft-futurism"
  | "neon-brutalist"
  | "cult-indie";

export interface AestheticFamilyMeta {
  id: AestheticFamily;
  label: string;
  signature: string;
}

/**
 * Each family's visual signature — shipped to the Design agent as a reference
 * vocabulary so it can reason about WHICH aesthetic it's committing to.
 */
export const AESTHETIC_FAMILIES: AestheticFamilyMeta[] = [
  {
    id: "editorial-minimalism",
    label: "Editorial Minimalism",
    signature:
      "Calm neutrals, serif or narrow-grotesque headlines, generous line-height, single accent. Built for reading, pricing, docs.",
  },
  {
    id: "terminal-core",
    label: "Terminal-Core",
    signature:
      "Monospace everywhere, phosphor-green or amber on near-black, hard edges, CLI metaphors.",
  },
  {
    id: "warm-editorial",
    label: "Warm Editorial",
    signature:
      "Terracotta, cream, clay. Serif body, approachable, human. Claude's own brand sits here.",
  },
  {
    id: "data-dense-pro",
    label: "Data-Dense Pro",
    signature:
      "Charts are the hero. Tight spacing, saturated categorical palette, fixed-width numerals, dark-first dashboards.",
  },
  {
    id: "cinematic-dark",
    label: "Cinematic Dark",
    signature:
      "Film-grade gradients, oversized type, motion-forward, media-heavy hero. Built for AI products and creator tools.",
  },
  {
    id: "playful-color",
    label: "Playful Color",
    signature:
      "High-saturation, illustrated accents, rounded corners, decorative shapes. Consumer-friendly.",
  },
  {
    id: "glass-soft-futurism",
    label: "Glass / Soft-Futurism",
    signature:
      "Frosted blur, layered translucency, soft gradients, Apple-adjacent. Premium consumer feel.",
  },
  {
    id: "neon-brutalist",
    label: "Neon Brutalist",
    signature:
      "Hard edges, deliberate-ugly type mixing, oversized numerals, saturated single hue. Statement pieces.",
  },
  {
    id: "cult-indie",
    label: "Cult / Indie",
    signature:
      "Off-road picks: indie SaaS, cult tools, magazines, museums, game studios. When nothing in the standard catalog fits.",
  },
];

export interface InspirationEntry {
  slug: string;
  name: string;
  category: InspirationCategory;
  family: AestheticFamily;
  summary: string;
}

export const INSPIRATION_CATALOG: InspirationEntry[] = [
  // AI & LLM Platforms
  { slug: "claude", name: "Claude", category: "ai-llm", family: "warm-editorial", summary: "Warm terracotta accent, clean editorial layout" },
  { slug: "cohere", name: "Cohere", category: "ai-llm", family: "cinematic-dark", summary: "Vibrant gradients, data-rich dashboard aesthetic" },
  { slug: "elevenlabs", name: "ElevenLabs", category: "ai-llm", family: "cinematic-dark", summary: "Dark cinematic UI, audio-waveform aesthetics" },
  { slug: "minimax", name: "Minimax", category: "ai-llm", family: "neon-brutalist", summary: "Bold dark interface with neon accents" },
  { slug: "mistral.ai", name: "Mistral AI", category: "ai-llm", family: "editorial-minimalism", summary: "French-engineered minimalism, purple-toned" },
  { slug: "ollama", name: "Ollama", category: "ai-llm", family: "terminal-core", summary: "Terminal-first, monochrome simplicity" },
  { slug: "opencode.ai", name: "OpenCode AI", category: "ai-llm", family: "terminal-core", summary: "Developer-centric dark theme" },
  { slug: "replicate", name: "Replicate", category: "ai-llm", family: "editorial-minimalism", summary: "Clean white canvas, code-forward" },
  { slug: "runwayml", name: "RunwayML", category: "ai-llm", family: "cinematic-dark", summary: "Cinematic dark UI, media-rich layout" },
  { slug: "together.ai", name: "Together AI", category: "ai-llm", family: "data-dense-pro", summary: "Technical, blueprint-style design" },
  { slug: "voltagent", name: "VoltAgent", category: "ai-llm", family: "terminal-core", summary: "Void-black canvas, emerald accent, terminal-native" },
  { slug: "x.ai", name: "xAI", category: "ai-llm", family: "editorial-minimalism", summary: "Stark monochrome, futuristic minimalism" },

  // Developer Tools & IDEs
  { slug: "cursor", name: "Cursor", category: "devtools", family: "cinematic-dark", summary: "Sleek dark interface, gradient accents" },
  { slug: "expo", name: "Expo", category: "devtools", family: "terminal-core", summary: "Dark theme, tight letter-spacing, code-centric" },
  { slug: "lovable", name: "Lovable", category: "devtools", family: "playful-color", summary: "Playful gradients, friendly dev aesthetic" },
  { slug: "raycast", name: "Raycast", category: "devtools", family: "glass-soft-futurism", summary: "Sleek dark chrome, vibrant gradient accents" },
  { slug: "superhuman", name: "Superhuman", category: "devtools", family: "cinematic-dark", summary: "Premium dark UI, keyboard-first, purple glow" },
  { slug: "vercel", name: "Vercel", category: "devtools", family: "editorial-minimalism", summary: "Black and white precision, Geist font" },
  { slug: "warp", name: "Warp", category: "devtools", family: "terminal-core", summary: "Dark IDE-like interface, block-based command UI" },

  // Backend, Database & DevOps
  { slug: "clickhouse", name: "ClickHouse", category: "backend-devops", family: "data-dense-pro", summary: "Yellow-accented, technical documentation style" },
  { slug: "composio", name: "Composio", category: "backend-devops", family: "data-dense-pro", summary: "Modern dark with colorful integration icons" },
  { slug: "hashicorp", name: "HashiCorp", category: "backend-devops", family: "editorial-minimalism", summary: "Enterprise-clean, black and white" },
  { slug: "mongodb", name: "MongoDB", category: "backend-devops", family: "editorial-minimalism", summary: "Green leaf branding, developer documentation focus" },
  { slug: "posthog", name: "PostHog", category: "backend-devops", family: "data-dense-pro", summary: "Playful hedgehog branding, developer-friendly dark UI" },
  { slug: "sanity", name: "Sanity", category: "backend-devops", family: "warm-editorial", summary: "Red accent, content-first editorial layout" },
  { slug: "sentry", name: "Sentry", category: "backend-devops", family: "data-dense-pro", summary: "Dark dashboard, data-dense, pink-purple accent" },
  { slug: "supabase", name: "Supabase", category: "backend-devops", family: "data-dense-pro", summary: "Dark emerald theme, code-first" },

  // Productivity & SaaS
  { slug: "cal", name: "Cal.com", category: "productivity-saas", family: "editorial-minimalism", summary: "Clean neutral UI, developer-oriented simplicity" },
  { slug: "intercom", name: "Intercom", category: "productivity-saas", family: "playful-color", summary: "Friendly blue palette, conversational UI patterns" },
  { slug: "linear.app", name: "Linear", category: "productivity-saas", family: "editorial-minimalism", summary: "Ultra-minimal, precise, purple accent" },
  { slug: "mintlify", name: "Mintlify", category: "productivity-saas", family: "editorial-minimalism", summary: "Clean, green-accented, reading-optimized" },
  { slug: "notion", name: "Notion", category: "productivity-saas", family: "warm-editorial", summary: "Warm minimalism, serif headings, soft surfaces" },
  { slug: "resend", name: "Resend", category: "productivity-saas", family: "terminal-core", summary: "Minimal dark theme, monospace accents" },
  { slug: "zapier", name: "Zapier", category: "productivity-saas", family: "playful-color", summary: "Warm orange, friendly illustration-driven" },

  // Design & Creative Tools
  { slug: "airtable", name: "Airtable", category: "design-creative", family: "playful-color", summary: "Colorful, friendly, structured data aesthetic" },
  { slug: "clay", name: "Clay", category: "design-creative", family: "glass-soft-futurism", summary: "Organic shapes, soft gradients, art-directed layout" },
  { slug: "figma", name: "Figma", category: "design-creative", family: "playful-color", summary: "Vibrant multi-color, playful yet professional" },
  { slug: "framer", name: "Framer", category: "design-creative", family: "cinematic-dark", summary: "Bold black and blue, motion-first, design-forward" },
  { slug: "miro", name: "Miro", category: "design-creative", family: "playful-color", summary: "Bright yellow accent, infinite canvas aesthetic" },
  { slug: "webflow", name: "Webflow", category: "design-creative", family: "editorial-minimalism", summary: "Blue-accented, polished marketing site aesthetic" },

  // Fintech & Crypto
  { slug: "binance", name: "Binance", category: "fintech", family: "neon-brutalist", summary: "Bold Binance Yellow on monochrome, trading-floor urgency" },
  { slug: "coinbase", name: "Coinbase", category: "fintech", family: "editorial-minimalism", summary: "Clean blue identity, trust-focused, institutional feel" },
  { slug: "kraken", name: "Kraken", category: "fintech", family: "data-dense-pro", summary: "Purple-accented dark UI, data-dense dashboards" },
  { slug: "mastercard", name: "Mastercard", category: "fintech", family: "warm-editorial", summary: "Warm cream canvas, orbital pill shapes, editorial warmth" },
  { slug: "revolut", name: "Revolut", category: "fintech", family: "glass-soft-futurism", summary: "Sleek dark interface, gradient cards, fintech precision" },
  { slug: "stripe", name: "Stripe", category: "fintech", family: "editorial-minimalism", summary: "Signature purple gradients, weight-300 elegance" },
  { slug: "wise", name: "Wise", category: "fintech", family: "playful-color", summary: "Bright green accent, friendly and clear" },

  // E-commerce & Retail
  { slug: "airbnb", name: "Airbnb", category: "ecommerce", family: "warm-editorial", summary: "Warm coral accent, photography-driven, rounded UI" },
  { slug: "meta", name: "Meta", category: "ecommerce", family: "editorial-minimalism", summary: "Photography-first, binary light/dark, Meta Blue CTAs" },
  { slug: "nike", name: "Nike", category: "ecommerce", family: "neon-brutalist", summary: "Monochrome UI, massive uppercase Futura, full-bleed photography" },
  { slug: "shopify", name: "Shopify", category: "ecommerce", family: "cinematic-dark", summary: "Dark-first cinematic, neon green accent, ultra-light display type" },

  // Media & Consumer Tech
  { slug: "apple", name: "Apple", category: "media-consumer", family: "editorial-minimalism", summary: "Premium white space, SF Pro, cinematic imagery" },
  { slug: "ibm", name: "IBM", category: "media-consumer", family: "data-dense-pro", summary: "Carbon design system, structured blue palette" },
  { slug: "nvidia", name: "NVIDIA", category: "media-consumer", family: "cinematic-dark", summary: "Green-black energy, technical power aesthetic" },
  { slug: "pinterest", name: "Pinterest", category: "media-consumer", family: "playful-color", summary: "Red accent, masonry grid, image-first" },
  { slug: "playstation", name: "PlayStation", category: "media-consumer", family: "cinematic-dark", summary: "Three-surface channel layout, cyan hover-scale interaction" },
  { slug: "spacex", name: "SpaceX", category: "media-consumer", family: "editorial-minimalism", summary: "Stark black and white, full-bleed imagery, futuristic" },
  { slug: "spotify", name: "Spotify", category: "media-consumer", family: "cinematic-dark", summary: "Vibrant green on dark, bold type, album-art-driven" },
  { slug: "theverge", name: "The Verge", category: "media-consumer", family: "neon-brutalist", summary: "Acid-mint and ultraviolet accents, Manuka display type" },
  { slug: "uber", name: "Uber", category: "media-consumer", family: "editorial-minimalism", summary: "Bold black and white, tight type, urban energy" },
  { slug: "vodafone", name: "Vodafone", category: "media-consumer", family: "neon-brutalist", summary: "Monumental uppercase display, Vodafone Red chapter bands" },
  { slug: "wired", name: "WIRED", category: "media-consumer", family: "warm-editorial", summary: "Paper-white broadsheet density, custom serif, ink-blue links" },

  // Automotive
  { slug: "bmw", name: "BMW", category: "automotive", family: "cinematic-dark", summary: "Dark premium surfaces, precise German engineering aesthetic" },
  { slug: "bugatti", name: "Bugatti", category: "automotive", family: "cinematic-dark", summary: "Cinema-black canvas, monochrome austerity, monumental display type" },
  { slug: "ferrari", name: "Ferrari", category: "automotive", family: "editorial-minimalism", summary: "Chiaroscuro black-white editorial, Ferrari Red with extreme sparseness" },
  { slug: "lamborghini", name: "Lamborghini", category: "automotive", family: "cinematic-dark", summary: "True black cathedral, gold accent, LamboType custom Neo-Grotesk" },
  { slug: "renault", name: "Renault", category: "automotive", family: "cinematic-dark", summary: "Vivid aurora gradients, NouvelR proprietary typeface, zero-radius buttons" },
  { slug: "tesla", name: "Tesla", category: "automotive", family: "editorial-minimalism", summary: "Radical subtraction, cinematic full-viewport photography, Universal Sans" },
];

/** Lookup a family's metadata by id. */
export function familyMeta(id: AestheticFamily): AestheticFamilyMeta {
  return AESTHETIC_FAMILIES.find((f) => f.id === id) ?? AESTHETIC_FAMILIES[0];
}

/**
 * Keyword patterns that trigger each category. Matched against the
 * user's latest prompt. Designed to be generous — a "dashboard" without
 * other context matches productivity-saas; "fintech dashboard" matches
 * both fintech and productivity-saas and we pull from both.
 */
const CATEGORY_KEYWORDS: Record<InspirationCategory, RegExp> = {
  "ai-llm": /\b(ai|llm|chat|claude|gpt|assistant|agent|model|copilot|prompt|inference)\b/i,
  "devtools": /\b(ide|editor|terminal|dev[- ]?tool|developer[- ]tool|coding|code editor|cli|repl)\b/i,
  "backend-devops": /\b(database|db|devops|ci\/cd|ci\b|cd\b|infra|infrastructure|api|backend|deployment|logs|monitoring|observability|telemetry|analytics)\b/i,
  "productivity-saas": /\b(saas|dashboard|crm|project[- ]?management|task|notes|scheduling|docs|wiki|workspace|meeting|calendar|kanban|email|inbox)\b/i,
  "design-creative": /\b(design|creative|illustration|figma|canvas|whiteboard|moodboard|portfolio|gallery|visual)\b/i,
  "fintech": /\b(fintech|bank|banking|payment|invoice|invoicing|crypto|trading|exchange|wallet|finance|financial|money|stock|portfolio|investment|hedge|ledger)\b/i,
  "ecommerce": /\b(ecommerce|e[- ]?commerce|shop|storefront|store|product|retail|cart|checkout|catalog|marketplace|sku)\b/i,
  "media-consumer": /\b(media|news|streaming|entertainment|magazine|blog|podcast|video|music|stream|feed|publication|broadcast)\b/i,
  "automotive": /\b(car|vehicle|auto|automotive|ev|electric vehicle|motor|dealership|bmw|tesla|ferrari|lamborghini|porsche)\b/i,
};

/**
 * Mood-based routing layer that sits between "explicit brand mentioned"
 * and "keyword category match". When the user's prompt is vague but
 * tonal ("silly", "serious", "editorial", etc.), we steer to an
 * aesthetic family that matches the mood instead of falling back to the
 * default SaaS trio — that was actively wrong for tonal prompts.
 */
const MOOD_ROUTES: Array<{ re: RegExp; families: AestheticFamily[] }> = [
  {
    re: /\b(silly|fun|playful|wacky|ridiculous|absurd|joke|whimsical|goofy|cute)\b/i,
    families: ["playful-color"],
  },
  {
    re: /\b(brutalist|ransom|zine|punk|raw|ugly[- ]on[- ]purpose|xerox)\b/i,
    families: ["neon-brutalist"],
  },
  {
    re: /\b(terminal|cli|retro[- ]computer|hacker|matrix|monospace|command[- ]line)\b/i,
    families: ["terminal-core"],
  },
  {
    re: /\b(editorial|magazine|newspaper|literary|book|manuscript|broadsheet)\b/i,
    families: ["warm-editorial"],
  },
  {
    re: /\b(cinematic|film|trailer|moody|dramatic|glow|hero|premium[- ]consumer)\b/i,
    families: ["cinematic-dark"],
  },
  {
    re: /\b(glass|frosted|translucent|blur|apple[- ]like|premium)\b/i,
    families: ["glass-soft-futurism"],
  },
];

/**
 * Fallback list used ONLY when the prompt is totally neutral (no brand,
 * no category, no mood). Intentionally short + flavor-safe — three
 * minimal / editorial brands that won't drag an otherwise-neutral
 * design toward a specific mood. EMPTY is still preferable for very
 * short prompts, so `matchInspirations` can return zero results when
 * it judges injecting anything would be noise.
 */
const NEUTRAL_FALLBACK_SLUGS = ["linear.app", "stripe", "apple"];

export interface Match {
  entry: InspirationEntry;
  reason: string;
}

export function matchInspirations(userPrompt: string, count = 2): Match[] {
  const text = userPrompt.toLowerCase();
  const out: Match[] = [];
  const seen = new Set<string>();

  // 1. Explicit brand mention — highest signal, pin it first.
  const explicit = INSPIRATION_CATALOG.find((e) => text.includes(e.name.toLowerCase()));
  if (explicit) {
    out.push({ entry: explicit, reason: `user mentioned ${explicit.name}` });
    seen.add(explicit.slug);
  }

  // 2. Mood / tone routing — the user didn't name a brand but said
  //    something like "silly" or "brutalist". Route to the matching
  //    aesthetic family so we don't inject tonally-wrong references.
  const moodFamilies: AestheticFamily[] = [];
  for (const route of MOOD_ROUTES) {
    if (route.re.test(text)) {
      for (const f of route.families) if (!moodFamilies.includes(f)) moodFamilies.push(f);
    }
  }
  if (moodFamilies.length > 0 && out.length < count) {
    for (let i = 0; out.length < count && i < moodFamilies.length * 3; i++) {
      const family = moodFamilies[i % moodFamilies.length];
      const pool = INSPIRATION_CATALOG.filter((e) => e.family === family && !seen.has(e.slug));
      if (pool.length === 0) continue;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      seen.add(pick.slug);
      out.push({ entry: pick, reason: `${family} mood match` });
    }
  }

  // 3. Category keyword match — domain-based signal (fintech, devtools,
  //    etc.). Round-robin through matched categories.
  const hits: InspirationCategory[] = [];
  for (const [cat, re] of Object.entries(CATEGORY_KEYWORDS) as Array<[InspirationCategory, RegExp]>) {
    if (re.test(text)) hits.push(cat);
  }
  if (hits.length > 0 && out.length < count) {
    for (let i = 0; out.length < count && i < hits.length * 3; i++) {
      const cat = hits[i % hits.length];
      const pool = INSPIRATION_CATALOG.filter((e) => e.category === cat && !seen.has(e.slug));
      if (pool.length === 0) continue;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      seen.add(pick.slug);
      out.push({ entry: pick, reason: `${cat} category match` });
    }
  }

  // 4. True fallback — only when we found NOTHING above AND the prompt
  //    is substantive enough that injecting generic neutral refs
  //    ("Linear / Stripe") is plausibly useful. For tiny vague prompts
  //    like "a silly landing page", we've already hit the mood branch;
  //    for a prompt like "a dashboard" we have a category match. So
  //    this branch only fires on the rare "I want a page" type prompts.
  //    Even then, we prefer emitting NO inspirations over wrong ones —
  //    an empty list lets Claude design from scratch.
  const looksSubstantive = text.trim().split(/\s+/).length >= 6;
  if (out.length === 0 && looksSubstantive) {
    for (const slug of NEUTRAL_FALLBACK_SLUGS) {
      if (out.length >= count) break;
      if (seen.has(slug)) continue;
      const entry = INSPIRATION_CATALOG.find((e) => e.slug === slug);
      if (!entry) continue;
      seen.add(slug);
      out.push({ entry, reason: "neutral fallback" });
    }
  }

  return out.slice(0, count);
}

/**
 * Fetch a single DESIGN.md as markdown. Cached in-memory for the lifetime
 * of the process. Returns null on fetch failure so a single broken brand
 * doesn't poison the whole turn.
 */
const fetchCache = new Map<string, string>();

export async function fetchInspiration(slug: string): Promise<string | null> {
  if (fetchCache.has(slug)) return fetchCache.get(slug) ?? null;
  const url = `https://getdesign.md/design-md/${slug}/DESIGN.md`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Forge/0.1 (+https://github.com/your/forge)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = await res.text();
    // Cap at 30KB to keep a wildly-long spec from dominating context.
    const capped = text.length > 30_000 ? text.slice(0, 30_000) + "\n<!-- truncated -->" : text;
    fetchCache.set(slug, capped);
    return capped;
  } catch {
    return null;
  }
}
