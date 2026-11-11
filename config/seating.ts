/**
 * Reception floor plan (01.04 Events layout, 21 Nov 2026).
 *
 * Coordinates are in the floor-plan's own pixel space (viewBox 0 0 1960 1250).
 * Table numbers: the plan had "30" twice, so the lower block was renumbered
 * 31–46 (old 30–45 + 1).
 *
 * Capacities are estimates counted from the plan's chair icons
 * (round = 10, long banquet segment = 14). Adjust here if the venue differs.
 */

export interface SeatingTable {
  number: number;
  shape: "round" | "long";
  capacity: number;
  x: number; // centre x
  y: number; // centre y
  w?: number; // long tables only
  h?: number;
}

export interface SeatingLandmark {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: boolean;
  tone?: "accent" | "plain";
}

export const SEATING_VIEWBOX = { w: 1920, h: 1200 };
export const ROUND_CAPACITY = 10;
export const LONG_CAPACITY = 14;

const round = (number: number, x: number, y: number): SeatingTable => ({
  number,
  shape: "round",
  capacity: ROUND_CAPACITY,
  x,
  y,
});

const long = (number: number, x: number, y: number): SeatingTable => ({
  number,
  shape: "long",
  capacity: LONG_CAPACITY,
  x,
  y,
  w: 108,
  h: 72,
});

// Upper block of round tables (13–30)
const topCols = [1000, 1113, 1225, 1337, 1449, 1553];
const topRows = [143, 255, 362];
const topNumbers = [
  [15, 18, 21, 22, 25, 30],
  [14, 17, 20, 23, 26, 29],
  [13, 16, 19, 24, 27, 28],
];

// Lower block of round tables (31–46); `0` marks an empty spot in the layout
const botCols = [1015, 1122, 1237, 1350, 1464, 1576];
const botRows = [768, 893, 1018];
const botNumbers = [
  [31, 34, 37, 40, 41, 44],
  [32, 35, 38, 39, 42, 45],
  [33, 36, 0, 0, 43, 46],
];

const roundTables: SeatingTable[] = [
  ...topNumbers.flatMap((row, r) => row.map((n, c) => round(n, topCols[c], topRows[r]))),
  ...botNumbers.flatMap((row, r) => row.filter(Boolean).map((n) => round(n, botCols[row.indexOf(n)], botRows[r]))),
];

// Long banquet tables 1–12 (three segments per row, four rows)
const longTables: SeatingTable[] = [
  long(1, 629, 230),
  long(2, 737, 230),
  long(3, 845, 230),
  long(4, 629, 327),
  long(5, 737, 327),
  long(6, 845, 327),
  long(7, 629, 767),
  long(8, 737, 767),
  long(9, 845, 767),
  long(10, 629, 880),
  long(11, 737, 880),
  long(12, 845, 880),
];

export const SEATING_TABLES: SeatingTable[] = [...longTables, ...roundTables].sort((a, b) => a.number - b.number);

export const SEATING_LANDMARKS: SeatingLandmark[] = [
  { label: "DJ", x: 45, y: 72, w: 122, h: 246, rotate: true },
  { label: "Stage", x: 22, y: 343, w: 232, h: 470, rotate: true },
  { label: "Live Band", x: 45, y: 834, w: 142, h: 288, rotate: true },
  { label: "DANCE FLOOR", x: 343, y: 389, w: 332, h: 297, rotate: true, tone: "accent" },
  { label: "Walk way", x: 675, y: 519, w: 1225, h: 68, tone: "accent" },
  { label: "False Wall", x: 1900, y: 183, w: 42, h: 810, rotate: true, tone: "accent" },
  { label: "Mocktail bar", x: 1763, y: 845, w: 87, h: 174, rotate: true },
  { label: "Photo Wall", x: 546, y: 1170, w: 1253, h: 64, tone: "accent" },
];

export const SEATING_TABLE_NUMBERS = new Set(SEATING_TABLES.map((t) => t.number));
export const seatingTableByNumber = (n: number) => SEATING_TABLES.find((t) => t.number === n);
