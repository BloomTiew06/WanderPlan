/**
 * On-demand translation of activity names and addresses.
 *
 * Live path is Google Translate or DeepL behind `VITE_TRANSLATE_ENDPOINT`.
 * Offline path is a small glossary covering the demo destinations — enough to
 * show a driver an address, which is the actual use case.
 */

const ENDPOINT = (import.meta as any).env?.VITE_TRANSLATE_ENDPOINT as string | undefined;

export const TRANSLATE_MODE: 'live' | 'local' = ENDPOINT ? 'live' : 'local';

const GLOSSARY: Record<string, Record<string, string>> = {
  ja: {
    'Mount Fuji (Kawaguchiko)': '富士山（河口湖）',
    'Sensō-ji Temple': '浅草寺',
    'teamLab Planets': 'チームラボプラネッツ',
    'Shibuya Crossing & Sky': '渋谷スクランブル交差点・渋谷スカイ',
    'Tsukiji Outer Market': '築地場外市場',
    'Meiji Jingū': '明治神宮',
    'Shinjuku Golden Gai': '新宿ゴールデン街',
    'Akihabara Electric Town': '秋葉原電気街',
    'Ueno Park & Museums': '上野公園と博物館',
    Shimokitazawa: '下北沢',
    'Tokyo Skytree': '東京スカイツリー',
    'Tonkotsu Ramen': '豚骨ラーメン',
    'Edomae Sushi': '江戸前寿司',
    Monjayaki: 'もんじゃ焼き',
    Taiyaki: 'たい焼き',
    '2-3-1 Asakusa, Taito City': '台東区浅草2-3-1',
    '6-1-16 Toyosu, Koto City': '江東区豊洲6-1-16',
    '1-1-2 Oshiage, Sumida City': '墨田区押上1-1-2',
  },
  ms: {
    'Mount Kinabalu': 'Gunung Kinabalu',
    'Manukan Island': 'Pulau Manukan',
    'Signal Hill Observatory': 'Balai Cerap Bukit Bendera',
    'Filipino Market': 'Pasar Filipina',
    'Tanjung Aru Beach': 'Pantai Tanjung Aru',
    'Mari Mari Cultural Village': 'Kampung Budaya Mari Mari',
    'Kota Kinabalu City Mosque': 'Masjid Bandaraya Kota Kinabalu',
    'Klias River Cruise': 'Pelayaran Sungai Klias',
    'Gaya Street Sunday Market': 'Pasar Ahad Jalan Gaya',
    'Poring Hot Springs': 'Kolam Air Panas Poring',
    'Sabah State Museum': 'Muzium Negeri Sabah',
    'Kek Lok Si Temple': 'Tokong Kek Lok Si',
    'Penang Hill': 'Bukit Bendera Pulau Pinang',
    'Penang National Park': 'Taman Negara Pulau Pinang',
    'Batu Ferringhi Beach': 'Pantai Batu Ferringhi',
  },
};

export async function translateText(text: string, targetLang: string): Promise<string> {
  if (ENDPOINT) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target: targetLang }),
      });
      if (res.ok) return (await res.json()).text as string;
    } catch (err) {
      console.warn('[translate] falling back to glossary:', err);
    }
  }
  await new Promise((r) => setTimeout(r, 280));
  return GLOSSARY[targetLang]?.[text] ?? `${text} — no offline translation on file`;
}

/**
 * Camera translate. A real build pairs an OCR pass (ML Kit or a cloud OCR API)
 * with the same translation call; the demo takes typed or pasted text so the
 * flow is exercisable without a camera on a laptop.
 */
export async function translateSign(text: string, targetLang: string): Promise<string[]> {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return Promise.all(lines.map((l) => translateText(l, targetLang)));
}

/** Browser speech synthesis for phrase playback — no API key needed. */
export function speak(text: string, lang: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'ja' ? 'ja-JP' : lang === 'ms' ? 'ms-MY' : lang === 'zh' ? 'zh-CN' : 'en-GB';
  u.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
