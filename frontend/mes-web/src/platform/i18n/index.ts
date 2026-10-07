import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import enShell from './locales/en/shell.json';
import koCommon from './locales/ko/common.json';
import koShell from './locales/ko/shell.json';
import viCommon from './locales/vi/common.json';
import viShell from './locales/vi/shell.json';

export const supportedLanguages = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
] as const;
export type LanguageCode = (typeof supportedLanguages)[number]['code'];

const storageKey = 'mes.language';

function initialLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(storageKey);
    if (supportedLanguages.some((l) => l.code === saved)) return saved as LanguageCode;
  } catch {
    // localStorage를 쓸 수 없으면 기본 언어를 쓴다.
  }
  return 'ko';
}

// common·shell은 초기 번들에 포함하고, 모듈 namespace는 route와 함께 lazy loading한다.
void i18n.use(initReactI18next).init({
  lng: initialLanguage(),
  fallbackLng: 'ko',
  defaultNS: 'common',
  ns: ['common', 'shell'],
  resources: {
    ko: { common: koCommon, shell: koShell },
    en: { common: enCommon, shell: enShell },
    vi: { common: viCommon, shell: viShell },
  },
  interpolation: { escapeValue: false },
  returnNull: false,
});

if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
  // 번역 누락은 개발 중에만 경고하고, 화면에는 ko 문구가 대신 표시된다.
  i18n.on('missingKey', (lngs, ns, key) => console.warn(`[i18n] 누락: ${lngs.join(',')}:${ns}:${key}`));
}

export function setLanguage(code: LanguageCode) {
  try {
    localStorage.setItem(storageKey, code);
  } catch {
    // 저장 실패는 무시한다. 이번 세션에서는 계속 적용된다.
  }
  document.documentElement.lang = code;
  return i18n.changeLanguage(code);
}

const loaders: Record<string, (lng: string) => Promise<{ default: object }>> = {
  dev: (lng) => import(`./locales/${lng}/dev.json`),
  auth: (lng) => import(`./locales/${lng}/auth.json`),
};

// route lazy 로더가 호출한다. 해당 언어 리소스가 없으면 ko로 대체된다.
export async function ensureNamespace(ns: string) {
  const load = loaders[ns];
  if (!load) throw new Error(`알 수 없는 namespace: ${ns}`);
  for (const lng of new Set(['ko', i18n.language])) {
    if (i18n.hasResourceBundle(lng, ns)) continue;
    try {
      i18n.addResourceBundle(lng, ns, (await load(lng)).default, true, true);
    } catch {
      // 해당 언어의 namespace 파일이 아직 없다. 개발 중 경고만 남기고 ko로 대체한다.
      if (lng === 'ko') throw new Error(`ko namespace 파일이 없습니다: ${ns}`);
    }
  }
}

export default i18n;
