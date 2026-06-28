export const COLORS = {
  bg: "var(--color-bg)",
  bgDark: "var(--color-bg-dark)",
  bgLight: "var(--color-bg-light)",

  surface: "var(--color-surface)",
  surfaceDark: "var(--color-surface-dark)",
  surfaceLight: "var(--color-surface-light)",
  surfaceSoft: "var(--color-surface-soft)",

  white: "var(--color-text)",
  text: "var(--color-text)",
  textLight: "var(--color-text-light)",
  textDark: "var(--color-text-dark)",

  gold: "var(--color-burning-flame)",
  goldDeep: "var(--color-truffle-trouble)",
  goldSoft: "var(--color-gold-soft)",

  muted: "var(--color-muted)",
  mutedDark: "var(--color-muted-dark)",
  mutedLight: "var(--color-muted-light)",

  border: "var(--color-border)",
  borderDark: "var(--color-border-dark)",
  borderLight: "var(--color-border-light)",

  danger: "var(--color-danger)",

  palladian: "var(--color-palladian)",
  oatmeal: "var(--color-oatmeal)",
  blueFantastic: "var(--color-blue-fantastic)",
  burningFlame: "var(--color-burning-flame)",
  truffleTrouble: "var(--color-truffle-trouble)",
  abyssalBlue: "var(--color-abyssal-blue)",
};

export const BASE =
  "https://kkimcezmyiqtfjdczeii.supabase.co/storage/v1/object/public/Portfolio";

// Exact folder names as they appear in Supabase Storage
export const FOLDER_CATEGORY_MAP = {
  "Birthdays/originals": "birthday",
  "Engadgements/originals": "engagement",
  "Landscapes/originals": "landscape",
  "Lifestyle/originals": "lifestyle",
  "Portraits/originals": "portrait",
  "Things/originals": "things",
  "Weddings/originals": "wedding",
};

export const ASPECT_MAP = {
  "Birthdays/originals": "4/5",
  "Engadgements/originals": "3/4",
  "Landscapes/originals": "16/9",
  "Lifestyle/originals": "4/5",
  "Portraits/originals": "4/5",
  "Things/originals": "1/1",
  "Weddings/originals": "3/4",
};

export const CATEGORY_LABELS = {
  birthday: "Birthdays",
  engagement: "Engagements",
  landscape: "Landscapes",
  lifestyle: "Lifestyle",
  portrait: "Portraits",
  things: "Things",
  wedding: "Weddings",
};
