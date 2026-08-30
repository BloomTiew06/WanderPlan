// Core data model. Mirrors section 8 of the proposal.

export type CostCategory =
  | 'flights'
  | 'accommodation'
  | 'food'
  | 'activities'
  | 'transport'
  | 'other';

export const COST_CATEGORIES: CostCategory[] = [
  'flights',
  'accommodation',
  'food',
  'activities',
  'transport',
  'other',
];

export type Pace = 'chill' | 'balanced' | 'packed';

export type InterestTag =
  | 'food'
  | 'nature'
  | 'nightlife'
  | 'culture'
  | 'shopping'
  | 'adventure'
  | 'relaxation'
  | 'photography';

export interface DateRange {
  /** ISO date, inclusive. */
  start: string;
  /** ISO date, inclusive. */
  end: string;
}

export interface Quiz {
  /** Per-person budget for the whole trip, in the trip currency. */
  budget: number;
  pace: Pace;
  interests: InterestTag[];
  /** Up to 3 non-negotiables. */
  mustDos: string[];
}

export interface Member {
  id: string;
  name: string;
  joinedAt: string;
  /** Empty array means "hasn't submitted"; see hasSubmittedAvailability. */
  availability: DateRange[];
  availabilitySubmitted: boolean;
  quiz: Quiz | null;
  /** Drives vote weighting (section 3b). */
  costContributed: number;
  role: 'organizer' | 'member';
  avatarColor: string;
  language: string;
}

export type ActivitySource = 'ai' | 'imported' | 'social' | 'manual';

export interface SocialRef {
  platform: string;
  url: string;
  caption: string;
  thumbnail: string;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  /** 24h "HH:mm". */
  start: string;
  durationMin: number;
  cost: number;
  category: CostCategory;
  source: ActivitySource;
  /** Imported bookings can't be rewritten by the AI planner. */
  locked?: boolean;
  /** Set when this activity exists because someone flagged it a must-do. */
  mustDoFor?: string;
  poiId?: string;
  dishId?: string;
  socialRef?: SocialRef;
  icon: string;
}

export interface Day {
  /** ISO date. */
  date: string;
  activities: Activity[];
  /** Set by the mid-trip replanner so the UI can show what moved. */
  note?: string;
}

export interface CostItem {
  id: string;
  label: string;
  amount: number;
  category: CostCategory;
  paidBy: string;
  /** Member ids sharing this cost. */
  splitAmong: string[];
  activityId?: string;
  /** ISO date the money is spent on, used for the day-by-day chart. */
  date: string;
  source: ActivitySource;
}

export interface VoteOption {
  id: string;
  label: string;
  detail?: string;
}

export interface VoteComment {
  id: string;
  memberId: string;
  text: string;
  at: string;
}

export interface Vote {
  id: string;
  question: string;
  why: string;
  options: VoteOption[];
  /** memberId -> optionId */
  ballots: Record<string, string>;
  comments: VoteComment[];
  createdAt: string;
  status: 'open' | 'resolved';
  winningOptionId?: string;
  resolution?: {
    kind: 'weighted' | 'tiebreaker';
    /** Member who made the final call, for tie-breaker resolutions. */
    byMemberId?: string;
    /** How the tie-breaker was chosen — logged so "why this person" is answerable. */
    tieBreakerPickedBy?: 'chosen' | 'random';
    at: string;
  };
  /** What folding the winning option into the trip should do. */
  effect?: { kind: 'pace'; value: Pace } | { kind: 'note'; value: string };
}

export interface Media {
  id: string;
  tripId: string;
  activityId?: string;
  /** Data URL or remote URL. Keeps the demo storage-free. */
  url: string;
  kind: 'photo' | 'video';
  caption?: string;
  by: string;
  at: string;
  /** 'checkin' media stays out of the trip gallery unless the user opts in. */
  tag: 'gallery' | 'checkin';
}

export interface Visit {
  id: string;
  memberId: string;
  tripId: string;
  activityId: string;
  placeName: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  at: string;
  method: 'auto' | 'manual';
  poiId?: string;
  dishId?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  channel: 'sms' | 'email';
  address: string;
}

export interface CheckIn {
  id: string;
  tripId: string;
  memberId: string;
  photoUrl: string;
  status: string;
  location: string;
  at: string;
  sentTo: string[];
  auto?: boolean;
}

export type StickerType = 'landmark' | 'food' | 'group';

export interface StickerDef {
  id: string;
  type: StickerType;
  displayName: string;
  icon: string;
  region: string;
  countryCode: string;
  /** Landmark stickers match a POI id; food stickers match a dish id. */
  itemId?: string;
  /** Group stickers unlock at N trips with the same crew. */
  tripsTogether?: number;
  hint: string;
}

export interface EarnedSticker {
  stickerId: string;
  tripId: string;
  at: string;
  /** Freeform position on the suitcase shell, 0..1 of shell width/height. */
  x: number;
  y: number;
  rotation: number;
}

export interface Mascot {
  name: string;
  points: number;
  lastFedAt: string | null;
  lastRestedAt: string | null;
  pinnedStickerId: string | null;
}

export interface Profile {
  memberId: string;
  name: string;
  language: string;
  mascot: Mascot;
  stickers: EarnedSticker[];
  emergencyContacts: EmergencyContact[];
  /** Hours of silence before the app nudges, then alerts contacts. */
  checkInThresholdHours: number;
}

export type TripStage = 'setup' | 'dates' | 'quiz' | 'planning' | 'active' | 'complete';

export interface Trip {
  id: string;
  destinationId: string;
  destinationName: string;
  countryCode: string;
  mode: 'solo' | 'group';
  createdBy: string;
  inviteCode: string;
  /** Deadline for group availability submissions. */
  respondBy: string | null;
  /** Rough month window picked off the best-time-to-visit screen. */
  seasonWindow: { startMonth: number; endMonth: number } | null;
  dates: DateRange | null;
  datesConfirmed: boolean;
  /** Soft warning only — never a hard block. */
  outsideRecommendedSeason: boolean;
  budgetCap: number;
  currency: string;
  categoryCaps: Partial<Record<CostCategory, number>>;
  /**
   * Pace the group settled on in a vote. Kept separate from each member's
   * stated preference so the snapshot still reports what people actually said,
   * rather than being rewritten to agree with the outcome.
   */
  decidedPace?: Pace;
  members: Member[];
  days: Day[];
  costItems: CostItem[];
  votes: Vote[];
  media: Media[];
  visits: Visit[];
  checkIns: CheckIn[];
  stage: TripStage;
  localLanguage: string;
  translationEnabled: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface AppState {
  profile: Profile;
  trips: Trip[];
  activeTripId: string | null;
  /** Simulated "today" so the demo can walk the trip forward. */
  clockOffsetDays: number;
}
