import type { CostCategory, InterestTag } from '../types';

/**
 * Curated destination data.
 *
 * The proposal offers two routes for best-time-to-visit: a small curated set
 * for the demo destinations, or an AI call per destination. This is the curated
 * set; `services/ai.ts` falls back to a generated profile for anywhere else,
 * behind the same interface.
 */

export interface MonthProfile {
  month: number;
  /** 'ideal' | 'good' | 'ok' | 'avoid' */
  rating: 'ideal' | 'good' | 'ok' | 'avoid';
  weather: string;
  crowds: 'low' | 'medium' | 'high';
  price: 'low' | 'medium' | 'high';
  note?: string;
}

export interface Poi {
  id: string;
  name: string;
  localName?: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  category: CostCategory;
  interests: InterestTag[];
  cost: number;
  durationMin: number;
  icon: string;
  /** Notable enough to have its own sticker. */
  landmark?: boolean;
  /** Best slot of day: 0 morning, 1 midday, 2 afternoon, 3 evening. */
  slot: 0 | 1 | 2 | 3;
}

export interface Dish {
  id: string;
  name: string;
  localName?: string;
  description: string;
  icon: string;
  /** Where you'd usually eat it. */
  venue: string;
  lat: number;
  lng: number;
  cost: number;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  city: string;
  lat: number;
  lng: number;
  currency: string;
  localLanguage: string;
  localLanguageName: string;
  blurb: string;
  months: MonthProfile[];
  pois: Poi[];
  dishes: Dish[];
  /** Ride-hailing coverage, drives the section 7 fallback. */
  rideHailing: string | null;
  localDrivers: { name: string; vehicle: string; perDay: number; rating: number }[];
}

const kk: Destination = {
  id: 'kota-kinabalu',
  name: 'Kota Kinabalu, Sabah',
  country: 'Malaysia',
  countryCode: 'MY',
  city: 'Kota Kinabalu',
  lat: 5.9804,
  lng: 116.0735,
  currency: 'MYR',
  localLanguage: 'ms',
  localLanguageName: 'Bahasa Malaysia',
  blurb: 'Islands on the doorstep, a 4,095 m mountain an hour inland, and the best sunsets in Borneo.',
  rideHailing: 'Grab',
  localDrivers: [
    { name: 'Azlan bin Yusof', vehicle: 'Toyota Innova (6 seats)', perDay: 320, rating: 4.9 },
    { name: 'Jenny Lim', vehicle: 'Nissan Serena (7 seats)', perDay: 350, rating: 4.8 },
  ],
  months: [
    { month: 0, rating: 'ok', weather: 'Tail of the wet season, short heavy showers', crowds: 'medium', price: 'medium' },
    { month: 1, rating: 'good', weather: 'Drying out, warm and humid', crowds: 'medium', price: 'medium', note: 'Chinese New Year pushes flights up for a fortnight' },
    { month: 2, rating: 'ideal', weather: 'Dry, calm seas, 26–32°C', crowds: 'medium', price: 'medium' },
    { month: 3, rating: 'ideal', weather: 'Driest stretch of the year, flat water for island hopping', crowds: 'medium', price: 'medium' },
    { month: 4, rating: 'ideal', weather: 'Hot and dry, best visibility for diving', crowds: 'high', price: 'high', note: 'Kaamatan harvest festival end of May — worth planning around' },
    { month: 5, rating: 'good', weather: 'Still dry, occasional afternoon storm', crowds: 'high', price: 'high' },
    { month: 6, rating: 'good', weather: 'Warm, light rain, clearest Kinabalu summit mornings', crowds: 'high', price: 'high' },
    { month: 7, rating: 'good', weather: 'Comfortable, brief showers', crowds: 'high', price: 'high' },
    { month: 8, rating: 'ok', weather: 'Humidity climbing, more frequent rain', crowds: 'medium', price: 'medium' },
    { month: 9, rating: 'avoid', weather: 'Monsoon building, rough seas', crowds: 'low', price: 'low', note: 'Island trips get cancelled at short notice' },
    { month: 10, rating: 'avoid', weather: 'Wettest month, heavy daily downpours', crowds: 'low', price: 'low' },
    { month: 11, rating: 'ok', weather: 'Still wet but festive, prices climb near year end', crowds: 'medium', price: 'high' },
  ],
  pois: [
    { id: 'kk-kinabalu', name: 'Mount Kinabalu', localName: 'Gunung Kinabalu', description: 'Southeast Asia’s most climbed peak. Day visitors do the Kinabalu Park botanical trails; summit attempts need a permit and an overnight at Laban Rata.', address: 'Kinabalu Park, Ranau, Sabah', lat: 6.0752, lng: 116.5581, category: 'activities', interests: ['nature', 'adventure', 'photography'], cost: 180, durationMin: 480, icon: '⛰️', landmark: true, slot: 0 },
    { id: 'kk-manukan', name: 'Manukan Island', description: 'Twenty minutes by boat from Jesselton Point. Snorkelling straight off the beach and a decent lunch shack.', address: 'Tunku Abdul Rahman Marine Park', lat: 5.9711, lng: 116.0022, category: 'activities', interests: ['nature', 'relaxation', 'adventure'], cost: 95, durationMin: 300, icon: '🏝️', landmark: true, slot: 0 },
    { id: 'kk-signal-hill', name: 'Signal Hill Observatory', description: 'The city’s viewpoint. Twenty-minute climb from the old town, best half an hour before sunset.', address: 'Bukit Bendera, Kota Kinabalu', lat: 5.9836, lng: 116.0793, category: 'activities', interests: ['photography', 'nature'], cost: 0, durationMin: 60, icon: '🔭', slot: 2 },
    { id: 'kk-filipino-market', name: 'Filipino Market', description: 'Handicraft stalls up front, grilled seafood out the back. Haggle politely and eat standing up.', address: 'Jalan Tun Fuad Stephens', lat: 5.9819, lng: 116.0748, category: 'other', interests: ['shopping', 'food'], cost: 40, durationMin: 90, icon: '🧺', slot: 3 },
    { id: 'kk-tanjung-aru', name: 'Tanjung Aru Beach', description: 'Locals’ sunset spot. Coconut stalls, kite sellers, and the flight path overhead.', address: 'Tanjung Aru, Kota Kinabalu', lat: 5.9450, lng: 116.0470, category: 'activities', interests: ['relaxation', 'photography'], cost: 0, durationMin: 90, icon: '🌅', landmark: true, slot: 3 },
    { id: 'kk-mari-mari', name: 'Mari Mari Cultural Village', description: 'Reconstructed longhouses of five Sabahan ethnic groups, with blowpipe demos and rice wine you will be offered twice.', address: 'Kionsom, Inanam', lat: 6.0186, lng: 116.2178, category: 'activities', interests: ['culture'], cost: 190, durationMin: 240, icon: '🛖', slot: 0 },
    { id: 'kk-city-mosque', name: 'Kota Kinabalu City Mosque', description: 'The floating mosque on Likas Bay. Modest dress required, robes available at the gate.', address: 'Jalan Teluk Likas', lat: 6.0086, lng: 116.1094, category: 'activities', interests: ['culture', 'photography'], cost: 5, durationMin: 60, icon: '🕌', landmark: true, slot: 1 },
    { id: 'kk-klias', name: 'Klias River Cruise', description: 'Proboscis monkeys at dusk and fireflies after dark. Two hours out of the city each way.', address: 'Klias Wetlands, Beaufort', lat: 5.4239, lng: 115.7069, category: 'activities', interests: ['nature', 'adventure'], cost: 210, durationMin: 420, icon: '🐒', slot: 2 },
    { id: 'kk-gaya-street', name: 'Gaya Street Sunday Market', description: 'Sunday only, 6am to 1pm. Orchids, street food, and a man who sells nothing but hats.', address: 'Jalan Gaya, KK', lat: 5.9838, lng: 116.0776, category: 'other', interests: ['shopping', 'food', 'culture'], cost: 30, durationMin: 120, icon: '🌺', slot: 0 },
    { id: 'kk-poring', name: 'Poring Hot Springs', description: 'Sulphur baths and a canopy walkway, usually paired with a Kinabalu Park day.', address: 'Ranau, Sabah', lat: 6.0463, lng: 116.7024, category: 'activities', interests: ['nature', 'relaxation'], cost: 60, durationMin: 180, icon: '♨️', slot: 2 },
    { id: 'kk-sabah-museum', name: 'Sabah State Museum', description: 'Best hour you can spend on the state’s history before you go looking at any of it.', address: 'Jalan Muzium', lat: 5.9614, lng: 116.0744, category: 'activities', interests: ['culture'], cost: 15, durationMin: 120, icon: '🏛️', slot: 1 },
    { id: 'kk-waterfront', name: 'KK Waterfront Bars', description: 'Row of open-air bars on the seafront. Cheap towers of beer, live covers by 9pm.', address: 'Jalan Tun Fuad Stephens', lat: 5.9802, lng: 116.0731, category: 'food', interests: ['nightlife'], cost: 70, durationMin: 150, icon: '🍻', slot: 3 },
  ],
  dishes: [
    { id: 'kk-hinava', name: 'Hinava', description: 'Kadazan-Dusun raw mackerel cured in lime with grated bambangan seed and chilli. Sabah’s signature dish.', icon: '🐟', venue: 'Kampung Nelayan', lat: 5.9556, lng: 116.0797, cost: 28 },
    { id: 'kk-tuaran-mee', name: 'Tuaran Mee', description: 'Handmade egg noodles fried with pork, egg roll strips and a wisp of wok smoke.', icon: '🍜', venue: 'Restoran Lucky, Tuaran', lat: 6.1755, lng: 116.2277, cost: 12 },
    { id: 'kk-sang-nyuk-mien', name: 'Sang Nyuk Mien', description: 'Hakka pork noodle soup, KK’s breakfast of choice. Order it dry with the soup on the side.', icon: '🥣', venue: 'Kedai Kopi Yee Fung', lat: 5.9832, lng: 116.0772, cost: 11 },
    { id: 'kk-ambuyat', name: 'Ambuyat', description: 'Sago starch eaten with a bamboo fork, dipped in sour tempoyak. Texture is the whole point.', icon: '🍢', venue: 'Restoran Sri Melaka', lat: 5.9737, lng: 116.0759, cost: 35 },
  ],
};

const tokyo: Destination = {
  id: 'tokyo',
  name: 'Tokyo, Japan',
  country: 'Japan',
  countryCode: 'JP',
  city: 'Tokyo',
  lat: 35.6762,
  lng: 139.6503,
  currency: 'JPY',
  localLanguage: 'ja',
  localLanguageName: 'Japanese',
  blurb: 'Thirteen million people, immaculate trains, and a different city on every block.',
  rideHailing: 'Uber',
  localDrivers: [
    { name: 'Hiro Tanaka', vehicle: 'Toyota Alphard (6 seats)', perDay: 42000, rating: 4.9 },
  ],
  months: [
    { month: 0, rating: 'ok', weather: 'Cold and dry, 2–10°C, very clear skies', crowds: 'low', price: 'low' },
    { month: 1, rating: 'ok', weather: 'Coldest month, plum blossom late on', crowds: 'low', price: 'low' },
    { month: 2, rating: 'ideal', weather: 'Mild, 8–15°C, cherry blossom from late March', crowds: 'high', price: 'high', note: 'Sakura peak — book accommodation months ahead' },
    { month: 3, rating: 'ideal', weather: 'Warm and pleasant, blossom into early April', crowds: 'high', price: 'high', note: 'Golden Week starts 29 April, avoid the tail end' },
    { month: 4, rating: 'ideal', weather: 'Best month: 18–24°C, low rain, everything green', crowds: 'medium', price: 'medium' },
    { month: 5, rating: 'avoid', weather: 'Tsuyu rainy season, humid and grey', crowds: 'low', price: 'low' },
    { month: 6, rating: 'avoid', weather: 'Hot and very humid, 30°C+, typhoon risk', crowds: 'high', price: 'high' },
    { month: 7, rating: 'avoid', weather: 'Peak heat and typhoon season', crowds: 'high', price: 'high' },
    { month: 8, rating: 'good', weather: 'Cooling off, typhoons taper through the month', crowds: 'medium', price: 'medium' },
    { month: 9, rating: 'ideal', weather: 'Crisp, dry, 15–22°C, autumn colour from late month', crowds: 'medium', price: 'medium' },
    { month: 10, rating: 'ideal', weather: 'Peak autumn leaves, cool and clear', crowds: 'high', price: 'high' },
    { month: 11, rating: 'good', weather: 'Cold but bright, illuminations everywhere', crowds: 'medium', price: 'high', note: 'New Year week shuts a lot of small restaurants' },
  ],
  pois: [
    { id: 'tk-fuji', name: 'Mount Fuji (Kawaguchiko)', localName: '富士山', description: 'Day trip by bus from Shinjuku. Clearest views before 9am from the lake’s north shore.', address: 'Fujikawaguchiko, Yamanashi', lat: 35.5104, lng: 138.7689, category: 'activities', interests: ['nature', 'photography', 'adventure'], cost: 8000, durationMin: 600, icon: '🗻', landmark: true, slot: 0 },
    { id: 'tk-senso-ji', name: 'Sensō-ji Temple', localName: '浅草寺', description: 'Tokyo’s oldest temple. Come at 7am and Nakamise-dōri is empty; come at 11am and it is not.', address: '2-3-1 Asakusa, Taito City', lat: 35.7148, lng: 139.7967, category: 'activities', interests: ['culture', 'photography'], cost: 0, durationMin: 90, icon: '⛩️', landmark: true, slot: 0 },
    { id: 'tk-teamlab', name: 'teamLab Planets', description: 'Barefoot digital art you walk through ankle-deep in water. Timed entry, book ahead.', address: '6-1-16 Toyosu, Koto City', lat: 35.6497, lng: 139.7906, category: 'activities', interests: ['culture', 'photography'], cost: 3800, durationMin: 120, icon: '🌀', landmark: true, slot: 1 },
    { id: 'tk-shibuya', name: 'Shibuya Crossing & Sky', description: 'The crossing from the Starbucks window, then Shibuya Sky for the rooftop view at dusk.', address: '2-24-12 Shibuya', lat: 35.6580, lng: 139.7016, category: 'activities', interests: ['photography', 'shopping'], cost: 2500, durationMin: 120, icon: '🚦', landmark: true, slot: 2 },
    { id: 'tk-tsukiji', name: 'Tsukiji Outer Market', description: 'The inner market moved to Toyosu; the outer market is still where you eat. Go hungry, go early.', address: '4 Chome Tsukiji, Chuo City', lat: 35.6654, lng: 139.7707, category: 'food', interests: ['food'], cost: 3000, durationMin: 120, icon: '🍣', slot: 0 },
    { id: 'tk-meiji', name: 'Meiji Jingū', localName: '明治神宮', description: 'Forest shrine in the middle of the city. Ten minutes from Harajuku and a world away from it.', address: '1-1 Yoyogikamizonocho, Shibuya', lat: 35.6764, lng: 139.6993, category: 'activities', interests: ['culture', 'nature'], cost: 0, durationMin: 90, icon: '🌲', landmark: true, slot: 0 },
    { id: 'tk-golden-gai', name: 'Shinjuku Golden Gai', description: 'Six alleys of bars with six seats each. Some charge a cover, most are worth it.', address: '1 Chome Kabukicho, Shinjuku', lat: 35.6938, lng: 139.7040, category: 'food', interests: ['nightlife'], cost: 4000, durationMin: 180, icon: '🏮', slot: 3 },
    { id: 'tk-akihabara', name: 'Akihabara Electric Town', description: 'Six floors of retro games in Super Potato, then whatever you find on the way out.', address: 'Sotokanda, Chiyoda City', lat: 35.6987, lng: 139.7730, category: 'other', interests: ['shopping', 'culture'], cost: 4000, durationMin: 150, icon: '🕹️', slot: 2 },
    { id: 'tk-ueno', name: 'Ueno Park & Museums', description: 'The park plus whichever of the four museums matches your group. Best under blossom.', address: 'Uenokoen, Taito City', lat: 35.7156, lng: 139.7745, category: 'activities', interests: ['culture', 'nature'], cost: 1000, durationMin: 180, icon: '🌸', slot: 1 },
    { id: 'tk-shimokita', name: 'Shimokitazawa', description: 'Second-hand shops, tiny coffee, no chain stores worth mentioning. An afternoon disappears here.', address: 'Kitazawa, Setagaya City', lat: 35.6614, lng: 139.6680, category: 'other', interests: ['shopping', 'food', 'culture'], cost: 3000, durationMin: 180, icon: '🎒', slot: 2 },
    { id: 'tk-onsen', name: 'Ōedo Onsen-style bathhouse, Odaiba', description: 'Public bath, tattoo rules vary — check before you go if that matters to your group.', address: 'Odaiba, Koto City', lat: 35.6197, lng: 139.7830, category: 'activities', interests: ['relaxation'], cost: 2900, durationMin: 150, icon: '♨️', slot: 3 },
    { id: 'tk-skytree', name: 'Tokyo Skytree', description: '634 m, and on a clear winter morning you can see Fuji from the top deck.', address: '1-1-2 Oshiage, Sumida City', lat: 35.7101, lng: 139.8107, category: 'activities', interests: ['photography'], cost: 3100, durationMin: 120, icon: '🗼', landmark: true, slot: 2 },
  ],
  dishes: [
    { id: 'tk-ramen', name: 'Tonkotsu Ramen', description: 'Pork bone broth boiled for eighteen hours. Order at the machine, sit, do not talk much.', icon: '🍜', venue: 'Ichiran Shibuya', lat: 35.6595, lng: 139.7005, cost: 1200 },
    { id: 'tk-sushi', name: 'Edomae Sushi', description: 'Counter sushi in the Tokyo style, vinegared rice slightly warm. Omakase or nothing.', icon: '🍣', venue: 'Tsukiji outer market', lat: 35.6654, lng: 139.7707, cost: 4500 },
    { id: 'tk-monjayaki', name: 'Monjayaki', description: 'Tokyo’s runnier answer to okonomiyaki, scraped off the griddle with a tiny spatula.', icon: '🥘', venue: 'Tsukishima Monja Street', lat: 35.6647, lng: 139.7833, cost: 2000 },
    { id: 'tk-taiyaki', name: 'Taiyaki', description: 'Fish-shaped pastry, red bean or custard. Eat it walking, that is the correct way.', icon: '🐟', venue: 'Naniwaya Sōhonten, Azabu', lat: 35.6580, lng: 139.7340, cost: 250 },
  ],
};

const penang: Destination = {
  id: 'penang',
  name: 'Penang, Malaysia',
  country: 'Malaysia',
  countryCode: 'MY',
  city: 'George Town',
  lat: 5.4141,
  lng: 100.3288,
  currency: 'MYR',
  localLanguage: 'ms',
  localLanguageName: 'Bahasa Malaysia',
  blurb: 'A UNESCO old town you can walk end to end, and the best street food in the country.',
  rideHailing: 'Grab',
  localDrivers: [{ name: 'Ravi Kumaran', vehicle: 'Toyota Vios (4 seats)', perDay: 260, rating: 4.7 }],
  months: [
    { month: 0, rating: 'ideal', weather: 'Dry and breezy, 24–31°C', crowds: 'high', price: 'high' },
    { month: 1, rating: 'ideal', weather: 'Driest month of the year', crowds: 'high', price: 'high' },
    { month: 2, rating: 'good', weather: 'Warm, occasional shower', crowds: 'medium', price: 'medium' },
    { month: 3, rating: 'ok', weather: 'Inter-monsoon storms build in the afternoon', crowds: 'medium', price: 'medium' },
    { month: 4, rating: 'ok', weather: 'Humid, frequent afternoon rain', crowds: 'medium', price: 'medium' },
    { month: 5, rating: 'good', weather: 'Drier spell, hot', crowds: 'medium', price: 'medium' },
    { month: 6, rating: 'good', weather: 'Warm with brief showers', crowds: 'medium', price: 'medium', note: 'George Town Festival runs through July' },
    { month: 7, rating: 'good', weather: 'Similar to July, slightly wetter', crowds: 'medium', price: 'medium' },
    { month: 8, rating: 'avoid', weather: 'Wettest stretch, daily thunderstorms', crowds: 'low', price: 'low' },
    { month: 9, rating: 'avoid', weather: 'Heavy rain, some flooding in low areas', crowds: 'low', price: 'low' },
    { month: 10, rating: 'ok', weather: 'Rain easing off, still humid', crowds: 'medium', price: 'medium' },
    { month: 11, rating: 'good', weather: 'Drying out, festive and busy', crowds: 'high', price: 'high' },
  ],
  pois: [
    { id: 'pg-kek-lok-si', name: 'Kek Lok Si Temple', description: 'Largest Buddhist temple in Malaysia, seven-storey pagoda, bronze Guanyin at the top.', address: 'Air Itam, Penang', lat: 5.3993, lng: 100.2733, category: 'activities', interests: ['culture', 'photography'], cost: 10, durationMin: 150, icon: '🛕', landmark: true, slot: 0 },
    { id: 'pg-street-art', name: 'George Town Street Art Trail', description: 'Ernest Zacharevic’s murals plus the wrought-iron cartoon series. Walkable in a morning.', address: 'Armenian Street, George Town', lat: 5.4166, lng: 100.3378, category: 'activities', interests: ['culture', 'photography'], cost: 0, durationMin: 150, icon: '🎨', landmark: true, slot: 0 },
    { id: 'pg-penang-hill', name: 'Penang Hill', description: 'Funicular to 833 m. Go up late afternoon, come down after the lights are on.', address: 'Bukit Bendera, Air Itam', lat: 5.4239, lng: 100.2686, category: 'activities', interests: ['nature', 'photography'], cost: 30, durationMin: 210, icon: '🚡', landmark: true, slot: 2 },
    { id: 'pg-clan-jetties', name: 'Chew Jetty', description: 'Stilt village on the water, still lived in. Be quiet, it is someone’s street.', address: 'Weld Quay, George Town', lat: 5.4131, lng: 100.3410, category: 'activities', interests: ['culture'], cost: 0, durationMin: 60, icon: '🛶', slot: 2 },
    { id: 'pg-gurney', name: 'Gurney Drive Hawker Centre', description: 'The famous one. Crowded, touristy, and the char kway teow is still excellent.', address: 'Persiaran Gurney', lat: 5.4370, lng: 100.3096, category: 'food', interests: ['food'], cost: 35, durationMin: 120, icon: '🍤', slot: 3 },
    { id: 'pg-national-park', name: 'Penang National Park', description: 'Smallest national park in the world. Two-hour hike to Monkey Beach or take a boat.', address: 'Teluk Bahang', lat: 5.4586, lng: 100.2036, category: 'activities', interests: ['nature', 'adventure'], cost: 20, durationMin: 300, icon: '🌴', slot: 0 },
    { id: 'pg-blue-mansion', name: 'Cheong Fatt Tze Mansion', description: 'The blue one. Guided tours three times a day and worth taking one.', address: '14 Leith Street', lat: 5.4207, lng: 100.3350, category: 'activities', interests: ['culture'], cost: 25, durationMin: 90, icon: '🏯', slot: 1 },
    { id: 'pg-batu-ferringhi', name: 'Batu Ferringhi Beach', description: 'Parasailing, night market, and sunsets over the strait.', address: 'Batu Ferringhi', lat: 5.4726, lng: 100.2450, category: 'activities', interests: ['relaxation', 'nightlife'], cost: 0, durationMin: 180, icon: '🏖️', slot: 3 },
  ],
  dishes: [
    { id: 'pg-laksa', name: 'Penang Assam Laksa', description: 'Sour mackerel and tamarind broth with thick rice noodles. Ranked among the best dishes on earth, correctly.', icon: '🍲', venue: 'Air Itam Laksa', lat: 5.3999, lng: 100.2779, cost: 8 },
    { id: 'pg-ckt', name: 'Char Kway Teow', description: 'Flat noodles, prawns, cockles, Chinese sausage, and wok hei you cannot fake.', icon: '🍳', venue: 'Siam Road Charcoal CKT', lat: 5.4179, lng: 100.3179, cost: 12 },
    { id: 'pg-cendol', name: 'Penang Cendol', description: 'Shaved ice, coconut milk, palm sugar, green pandan noodles. Queue is part of it.', icon: '🍧', venue: 'Penang Road Famous Teochew Chendul', lat: 5.4184, lng: 100.3320, cost: 5 },
    { id: 'pg-nasi-kandar', name: 'Nasi Kandar', description: 'Rice flooded with several curries at once. Point at things, trust the process.', icon: '🍛', venue: 'Line Clear, Penang Road', lat: 5.4192, lng: 100.3312, cost: 15 },
  ],
};

export const DESTINATIONS: Destination[] = [kk, tokyo, penang];

export function findDestination(id: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.id === id);
}

export function searchDestinations(q: string): Destination[] {
  const s = q.trim().toLowerCase();
  if (!s) return DESTINATIONS;
  return DESTINATIONS.filter(
    (d) =>
      d.name.toLowerCase().includes(s) ||
      d.country.toLowerCase().includes(s) ||
      d.city.toLowerCase().includes(s),
  );
}

/** Months rated ideal or good — what the season banner and overlap check use. */
export function recommendedMonths(d: Destination): number[] {
  return d.months.filter((m) => m.rating === 'ideal' || m.rating === 'good').map((m) => m.month);
}

export function idealMonths(d: Destination): number[] {
  return d.months.filter((m) => m.rating === 'ideal').map((m) => m.month);
}
