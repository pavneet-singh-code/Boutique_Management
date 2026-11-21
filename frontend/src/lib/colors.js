// Earthy colours for people. Keep in step with backend models.EMPLOYEE_COLORS.
// They never use the status colours (sage = done, mustard = needs review,
// rust = late), and a person's colour is always shown with their initials.

export const EMPLOYEE_COLORS = [
  "#3f7a78", // teal
  "#4f6f8c", // slate blue
  "#7a5675", // plum
  "#2e5e52", // pine
  "#a0616a", // dusty rose
  "#6b5040", // walnut
  "#5e8c86", // sea glass
  "#8c6a7e", // mauve
  "#3b5b7a", // denim
  "#5a5f66", // graphite
];

// The first, brighter set (saved on people added before the earthy look):
// each one is shown as the earthy colour in the same place.
const OLD_COLORS = [
  "#2563eb", "#7c3aed", "#0d9488", "#db2777", "#4f46e5",
  "#0284c7", "#9333ea", "#92400e", "#475569", "#c026d3",
];
const OLD_TO_NEW = Object.fromEntries(OLD_COLORS.map((old, i) => [old, EMPLOYEE_COLORS[i]]));

export const NO_PERSON_COLOR = "#a3a386"; // sage grey

/** The colour to draw for a person (old saved colours become earthy ones). */
export function employeeColor(employee) {
  const saved = (employee?.color || "").toLowerCase();
  return OLD_TO_NEW[saved] || saved || EMPLOYEE_COLORS[9];
}
