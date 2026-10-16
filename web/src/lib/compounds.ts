export interface CompoundStyle {
  label: string;
  letter: string;
  colour: string;
  // Text colour that keeps AA contrast on the compound colour.
  ink: string;
}

const COMPOUNDS: Record<string, CompoundStyle> = {
  SOFT: { label: "Soft", letter: "S", colour: "#ff4d4d", ink: "#1a0000" },
  MEDIUM: { label: "Medium", letter: "M", colour: "#ffd23f", ink: "#1f1600" },
  HARD: { label: "Hard", letter: "H", colour: "#eef1f4", ink: "#111418" },
  INTERMEDIATE: { label: "Intermediate", letter: "I", colour: "#3ccf5a", ink: "#001a06" },
  WET: { label: "Wet", letter: "W", colour: "#3d8bff", ink: "#00122e" },
};

const UNKNOWN: CompoundStyle = { label: "Unknown", letter: "?", colour: "#6b7480", ink: "#ffffff" };

export function compound(name: string | null | undefined): CompoundStyle {
  return (name && COMPOUNDS[name.toUpperCase()]) || UNKNOWN;
}

export const COMPOUND_ORDER = ["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"] as const;
