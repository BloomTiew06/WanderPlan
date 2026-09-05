/**
 * The one place colour is defined.
 *
 * Plain JS rather than TypeScript so `tailwind.config.js` (loaded by PostCSS in
 * Node) and the app's TypeScript modules can both import it. Charts, SVG, and
 * inline styles can't use Tailwind classes, so without this the palette drifts
 * across a dozen files.
 *
 * The theme is blue and green over warm earth neutrals: deep sea and pine for
 * the chrome, sand and stone for the surfaces, terracotta and ochre where a
 * warm accent earns its place.
 */

/** @type {Record<string, string>} */
export const COLORS = {
  /** Near-black with a pine-teal cast. All body text. */
  ink: '#10262c',
  /** Off-white with a faint green cast. Page background. */
  paper: '#f5f7f3',
  /** Sage stone. Inset fills, hover states, muted chips. */
  sand: '#e3e9e2',
  /** A step darker than sand, for progress-bar tracks against a card. */
  silt: '#cfd8d0',

  /** Deep sea blue. Primary accent and calls to action. */
  ocean: '#145c7a',
  /** Teal. The mascot's shell, map regions, positive emphasis. */
  sea: '#0f7c74',
  /** Readable blue for informational chips and links. */
  sky: '#1f63b4',
  /** Forest green. Good states, positive balances, on-track budgets. */
  moss: '#3f6b45',
  /** Deep pine. Reserved for dark-on-light accents. */
  pine: '#1e4a3c',

  /** Terracotta. Negative states, over budget, must-do badges. */
  clay: '#b4482b',
  /** Earthy amber. Warnings. */
  sun: '#b07a12',
  /** Muted earth grey. */
  stone: '#8a9086',
};

/**
 * Categorical palette for the six budget categories, in the order they are
 * rendered. Validated with the data-viz palette checker against the `paper`
 * surface: lightness band, chroma floor, adjacent-pair CVD separation
 * (protan/deutan/tritan) and the normal-vision floor all pass.
 *
 * The order matters — the checks are on adjacent pairs, which is what sits
 * side by side in the donut and the stacked budget bar. Re-run the validator
 * before reordering or restyling these.
 *
 * Two slots (`activities`, `other`) sit under 3:1 against the surface, which
 * obliges visible labels rather than colour alone. Every chart using them ships
 * a legend, and the budget screen lists each category by name with its
 * subtotal.
 *
 * @type {Record<string, string>}
 */
export const CHART = {
  flights: '#2472ce',
  accommodation: '#b3559b',
  food: '#b4482b',
  activities: '#0fa79b',
  transport: '#3f7f2e',
  other: '#d9a31c',
};

/** Member avatars. Reuses the validated categorical hues so they stay distinct. */
export const AVATAR_COLORS = [
  CHART.flights,
  CHART.activities,
  CHART.transport,
  CHART.accommodation,
  CHART.food,
  CHART.other,
];

/** Recessive grid and axis lines, as used by the charts. */
export const CHART_GRID = '#10262c14';
