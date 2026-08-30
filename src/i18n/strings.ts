/**
 * UI localisation. A hand-rolled dictionary rather than react-i18next — the
 * lookup shape (`t('key')`, per-user language, fallback to English) is the same,
 * and it keeps the demo dependency-free.
 */

export type Lang = 'en' | 'ms' | 'ja' | 'zh';

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ms', label: 'Malay', native: 'Bahasa Malaysia' },
  { code: 'ja', label: 'Japanese', native: '日本語' },
  { code: 'zh', label: 'Chinese', native: '中文' },
];

type Dict = Record<string, string>;

const en: Dict = {
  'nav.trips': 'Trips',
  'nav.itinerary': 'Itinerary',
  'nav.stays': 'Stays & Flights',
  'nav.budget': 'Budget',
  'nav.spending': 'Spending',
  'nav.map': 'My Map',
  'nav.passport': 'Passport',
  'nav.recap': 'Recap',
  'nav.profile': 'Profile',
  'action.newTrip': 'New Trip',
  'action.generate': 'Generate Itinerary',
  'action.regenerate': 'Regenerate day',
  'action.swap': 'Swap',
  'action.accept': 'Accept',
  'action.tryAgain': 'Try again',
  'action.book': 'Book',
  'action.import': 'Import booking',
  'action.checkIn': "I'm here",
  'action.somethingChanged': 'Something changed',
  'action.getThere': 'Get there',
  'action.translate': 'Translate',
  'label.day': 'Day',
  'label.cost': 'Cost',
  'label.budget': 'Budget',
  'label.spent': 'Spent',
  'label.remaining': 'Remaining',
  'label.perPerson': 'per person',
  'label.owes': 'owes',
  'label.mustDo': "must-do",
  'label.imported': 'Imported',
  'label.deadline': 'Responses close',
  'label.waiting': 'Waiting on',
  'phrase.title': 'Useful phrases',
};

const ms: Dict = {
  'nav.trips': 'Perjalanan',
  'nav.itinerary': 'Jadual',
  'nav.stays': 'Penginapan & Penerbangan',
  'nav.budget': 'Bajet',
  'nav.spending': 'Perbelanjaan',
  'nav.map': 'Peta Saya',
  'nav.passport': 'Pasport',
  'nav.recap': 'Ringkasan',
  'nav.profile': 'Profil',
  'action.newTrip': 'Perjalanan Baharu',
  'action.generate': 'Jana Jadual',
  'action.regenerate': 'Jana semula hari',
  'action.swap': 'Tukar',
  'action.accept': 'Terima',
  'action.tryAgain': 'Cuba lagi',
  'action.book': 'Tempah',
  'action.import': 'Import tempahan',
  'action.checkIn': 'Saya di sini',
  'action.somethingChanged': 'Ada perubahan',
  'action.getThere': 'Ke sana',
  'action.translate': 'Terjemah',
  'label.day': 'Hari',
  'label.cost': 'Kos',
  'label.budget': 'Bajet',
  'label.spent': 'Dibelanjakan',
  'label.remaining': 'Baki',
  'label.perPerson': 'setiap orang',
  'label.owes': 'hutang kepada',
  'label.mustDo': 'mesti buat',
  'label.imported': 'Diimport',
  'label.deadline': 'Tutup maklum balas',
  'label.waiting': 'Menunggu',
  'phrase.title': 'Frasa berguna',
};

const ja: Dict = {
  'nav.trips': '旅行',
  'nav.itinerary': '旅程',
  'nav.stays': '宿泊・航空券',
  'nav.budget': '予算',
  'nav.spending': '支出',
  'nav.map': 'マイマップ',
  'nav.passport': 'パスポート',
  'nav.recap': '振り返り',
  'nav.profile': 'プロフィール',
  'action.newTrip': '新しい旅行',
  'action.generate': '旅程を作成',
  'action.regenerate': 'この日を再作成',
  'action.swap': '差し替え',
  'action.accept': '確定',
  'action.tryAgain': 'もう一度',
  'action.book': '予約',
  'action.import': '予約を取り込む',
  'action.checkIn': 'ここにいます',
  'action.somethingChanged': '変更あり',
  'action.getThere': '行き方',
  'action.translate': '翻訳',
  'label.day': '日目',
  'label.cost': '費用',
  'label.budget': '予算',
  'label.spent': '使用額',
  'label.remaining': '残り',
  'label.perPerson': '1人あたり',
  'label.owes': 'から',
  'label.mustDo': '外せない',
  'label.imported': '取り込み済み',
  'label.deadline': '回答締切',
  'label.waiting': '未回答',
  'phrase.title': '便利なフレーズ',
};

const zh: Dict = {
  'nav.trips': '行程',
  'nav.itinerary': '日程',
  'nav.stays': '住宿与机票',
  'nav.budget': '预算',
  'nav.spending': '支出',
  'nav.map': '我的地图',
  'nav.passport': '护照',
  'nav.recap': '回顾',
  'nav.profile': '个人资料',
  'action.newTrip': '新行程',
  'action.generate': '生成日程',
  'action.regenerate': '重新生成这一天',
  'action.swap': '更换',
  'action.accept': '接受',
  'action.tryAgain': '再试一次',
  'action.book': '预订',
  'action.import': '导入预订',
  'action.checkIn': '我到了',
  'action.somethingChanged': '有变化',
  'action.getThere': '怎么去',
  'action.translate': '翻译',
  'label.day': '第',
  'label.cost': '费用',
  'label.budget': '预算',
  'label.spent': '已花费',
  'label.remaining': '剩余',
  'label.perPerson': '每人',
  'label.owes': '欠',
  'label.mustDo': '必去',
  'label.imported': '已导入',
  'label.deadline': '截止回复',
  'label.waiting': '等待',
  'phrase.title': '实用短语',
};

const DICTS: Record<Lang, Dict> = { en, ms, ja, zh };

export function translateKey(lang: Lang, key: string): string {
  return DICTS[lang]?.[key] ?? en[key] ?? key;
}

export interface Phrase {
  en: string;
  local: string;
  romanised?: string;
  category: 'basics' | 'directions' | 'food' | 'help';
}

/** Quick-phrase panel content, keyed by the destination's local language. */
export const PHRASES: Record<string, Phrase[]> = {
  ms: [
    { en: 'Hello', local: 'Helo / Apa khabar', category: 'basics' },
    { en: 'Thank you', local: 'Terima kasih', category: 'basics' },
    { en: 'How much is this?', local: 'Berapa harganya?', category: 'basics' },
    { en: 'Where is the toilet?', local: 'Di mana tandas?', category: 'directions' },
    { en: 'Please take me to this address', local: 'Tolong hantar saya ke alamat ini', category: 'directions' },
    { en: 'Is it far?', local: 'Jauh tak?', category: 'directions' },
    { en: 'Not spicy, please', local: 'Kurang pedas', category: 'food' },
    { en: 'No pork / no beef', local: 'Tiada khinzir / tiada daging lembu', category: 'food' },
    { en: 'The bill, please', local: 'Bil, tolong', category: 'food' },
    { en: 'I need help', local: 'Saya perlukan bantuan', category: 'help' },
    { en: 'Call an ambulance', local: 'Panggil ambulans', category: 'help' },
    { en: "I've lost my passport", local: 'Saya hilang pasport saya', category: 'help' },
  ],
  ja: [
    { en: 'Hello', local: 'こんにちは', romanised: 'Konnichiwa', category: 'basics' },
    { en: 'Thank you', local: 'ありがとうございます', romanised: 'Arigatō gozaimasu', category: 'basics' },
    { en: 'How much is this?', local: 'これはいくらですか', romanised: 'Kore wa ikura desu ka', category: 'basics' },
    { en: 'Where is the toilet?', local: 'トイレはどこですか', romanised: 'Toire wa doko desu ka', category: 'directions' },
    { en: 'Please take me to this address', local: 'この住所までお願いします', romanised: 'Kono jūsho made onegaishimasu', category: 'directions' },
    { en: 'Which platform?', local: '何番線ですか', romanised: 'Nanbansen desu ka', category: 'directions' },
    { en: 'No meat, please', local: '肉は入れないでください', romanised: 'Niku wa irenaide kudasai', category: 'food' },
    { en: 'Can I pay by card?', local: 'カードで払えますか', romanised: 'Kādo de haraemasu ka', category: 'food' },
    { en: 'It was delicious', local: 'ごちそうさまでした', romanised: 'Gochisōsama deshita', category: 'food' },
    { en: 'I need help', local: '助けてください', romanised: 'Tasukete kudasai', category: 'help' },
    { en: 'Call an ambulance', local: '救急車を呼んでください', romanised: 'Kyūkyūsha o yonde kudasai', category: 'help' },
    { en: "I'm lost", local: '道に迷いました', romanised: 'Michi ni mayoimashita', category: 'help' },
  ],
};
