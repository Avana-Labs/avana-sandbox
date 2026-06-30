import type { LanguageCode } from "@/app/components/display-preferences"

/**
 * Lightweight i18n dictionary. Keys ARE the English source strings, so wiring a
 * component is just `t("Borrow")` and any untranslated key falls back to English
 * automatically. This Phase-1 set covers the global chrome (header nav, the
 * preferences menu, primary CTAs) — the highest-visibility surface — for the
 * languages offered in the switcher. Add more keys/locales incrementally; the
 * fallback guarantees nothing ever renders blank.
 */
export type TranslationDictionary = Partial<Record<string, string>>

// English is the implicit base (a key with no entry returns itself), so only the
// other locales carry maps here.
const ZH_CN: TranslationDictionary = {
  Home: "首页",
  Express: "快捷",
  Borrow: "借款",
  Lend: "存款",
  Multiply: "杠杆",
  Dashboard: "仪表盘",
  Rewards: "奖励",
  "Support center": "支持中心",
  Language: "语言",
  Currency: "货币",
  "Dollar amounts": "金额显示",
  "Connect Wallet": "连接钱包",
  "Sign in": "登录",
  Settings: "设置",
}

const ZH_TW: TranslationDictionary = {
  Home: "首頁",
  Express: "快捷",
  Borrow: "借款",
  Lend: "存款",
  Multiply: "槓桿",
  Dashboard: "儀表板",
  Rewards: "獎勵",
  "Support center": "支援中心",
  Language: "語言",
  Currency: "貨幣",
  "Dollar amounts": "金額顯示",
  "Connect Wallet": "連接錢包",
  "Sign in": "登入",
  Settings: "設定",
}

const ES: TranslationDictionary = {
  Home: "Inicio",
  Express: "Exprés",
  Borrow: "Pedir prestado",
  Lend: "Prestar",
  Multiply: "Multiplicar",
  Dashboard: "Panel",
  Rewards: "Recompensas",
  "Support center": "Centro de ayuda",
  Language: "Idioma",
  Currency: "Moneda",
  "Dollar amounts": "Importes",
  "Connect Wallet": "Conectar cartera",
  "Sign in": "Iniciar sesión",
  Settings: "Ajustes",
}

const FR: TranslationDictionary = {
  Home: "Accueil",
  Express: "Express",
  Borrow: "Emprunter",
  Lend: "Prêter",
  Multiply: "Multiplier",
  Dashboard: "Tableau de bord",
  Rewards: "Récompenses",
  "Support center": "Centre d'aide",
  Language: "Langue",
  Currency: "Devise",
  "Dollar amounts": "Montants",
  "Connect Wallet": "Connecter le portefeuille",
  "Sign in": "Se connecter",
  Settings: "Paramètres",
}

const PT: TranslationDictionary = {
  Home: "Início",
  Express: "Expresso",
  Borrow: "Pedir emprestado",
  Lend: "Emprestar",
  Multiply: "Multiplicar",
  Dashboard: "Painel",
  Rewards: "Recompensas",
  "Support center": "Central de ajuda",
  Language: "Idioma",
  Currency: "Moeda",
  "Dollar amounts": "Valores",
  "Connect Wallet": "Conectar carteira",
  "Sign in": "Entrar",
  Settings: "Configurações",
}

const NL: TranslationDictionary = {
  Home: "Home",
  Express: "Express",
  Borrow: "Lenen",
  Lend: "Uitlenen",
  Multiply: "Hefboom",
  Dashboard: "Dashboard",
  Rewards: "Beloningen",
  "Support center": "Helpcentrum",
  Language: "Taal",
  Currency: "Valuta",
  "Dollar amounts": "Bedragen",
  "Connect Wallet": "Wallet verbinden",
  "Sign in": "Inloggen",
  Settings: "Instellingen",
}

const ID: TranslationDictionary = {
  Home: "Beranda",
  Express: "Ekspres",
  Borrow: "Pinjam",
  Lend: "Pinjamkan",
  Multiply: "Leverage",
  Dashboard: "Dasbor",
  Rewards: "Hadiah",
  "Support center": "Pusat bantuan",
  Language: "Bahasa",
  Currency: "Mata uang",
  "Dollar amounts": "Nilai",
  "Connect Wallet": "Hubungkan dompet",
  "Sign in": "Masuk",
  Settings: "Pengaturan",
}

const JA: TranslationDictionary = {
  Home: "ホーム",
  Express: "エクスプレス",
  Borrow: "借りる",
  Lend: "貸す",
  Multiply: "レバレッジ",
  Dashboard: "ダッシュボード",
  Rewards: "リワード",
  "Support center": "サポートセンター",
  Language: "言語",
  Currency: "通貨",
  "Dollar amounts": "金額表示",
  "Connect Wallet": "ウォレットを接続",
  "Sign in": "サインイン",
  Settings: "設定",
}

const KO: TranslationDictionary = {
  Home: "홈",
  Express: "익스프레스",
  Borrow: "대출",
  Lend: "예치",
  Multiply: "레버리지",
  Dashboard: "대시보드",
  Rewards: "리워드",
  "Support center": "고객 지원",
  Language: "언어",
  Currency: "통화",
  "Dollar amounts": "금액 표시",
  "Connect Wallet": "지갑 연결",
  "Sign in": "로그인",
  Settings: "설정",
}

const RU: TranslationDictionary = {
  Home: "Главная",
  Express: "Экспресс",
  Borrow: "Заём",
  Lend: "Кредитование",
  Multiply: "Плечо",
  Dashboard: "Панель",
  Rewards: "Награды",
  "Support center": "Центр поддержки",
  Language: "Язык",
  Currency: "Валюта",
  "Dollar amounts": "Суммы",
  "Connect Wallet": "Подключить кошелёк",
  "Sign in": "Войти",
  Settings: "Настройки",
}

export const TRANSLATIONS: Partial<Record<LanguageCode, TranslationDictionary>> = {
  EN: {},
  "ZH-CN": ZH_CN,
  "ZH-TW": ZH_TW,
  NL,
  FR,
  ID,
  JA,
  KO,
  PT,
  RU,
  "ES-ES": ES,
  "ES-LATAM": ES,
  "ES-US": ES,
  "ES-AR": ES,
}

/** Map our language codes to a valid BCP-47 tag for the document `lang` attribute. */
export const LANGUAGE_HTML_LANG: Record<LanguageCode, string> = {
  EN: "en",
  "ZH-CN": "zh-Hans",
  "ZH-TW": "zh-Hant",
  NL: "nl",
  FR: "fr",
  ID: "id",
  JA: "ja",
  KO: "ko",
  PT: "pt",
  RU: "ru",
  "ES-ES": "es-ES",
  "ES-LATAM": "es-419",
  "ES-US": "es-US",
  "ES-AR": "es-AR",
}

export function translate(language: LanguageCode, key: string): string {
  return TRANSLATIONS[language]?.[key] ?? key
}
