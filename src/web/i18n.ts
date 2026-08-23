// 초경량 ko/en 다국어. 라이브러리 없이 사전 객체 + t() 헬퍼만 사용한다.
// 언어 결정 우선순위: localStorage > navigator.language > en
export type Lang = "en" | "ko";

const STRINGS = {
  en: {
    navNew: "New paste",
    tagline: "Ephemeral · Private · Disposable — secure text sharing for developers",
    homeHeading: "New secure paste",
    content: "Content",
    placeholder: "Paste your code, log, or text here…",
    expiration: "Expiration",
    secret: "Secret encryption",
    burn: "Burn after reading",
    language: "Language",
    create: "Create secure paste",
    errEmpty: "Please enter some content.",
    errTooLarge: (n: number) => `Content is too large (max ${n} KiB).`,
    errEncryptTooLarge: "Payload exceeds the size limit after encryption.",
    errRateLimited: "Too many requests. Please try again later.",
    errCreateFailed: "Create failed: ",
    resultTitle: "Paste created",
    expiresAt: "Expires at",
    encrypted: "Encrypted",
    burnAfterRead: "Burn after reading",
    yes: "Yes",
    no: "No",
    copyLink: "Copy link",
    copied: "Link copied to clipboard.",
    copyFallback: "Automatic copy failed — select the URL and copy it manually.",
    open: "Open",
    keyWarning:
      "This URL contains the decryption key (#k=…). If you lose this URL, the content cannot be recovered.",
    oneTimeTitle: "One-time paste",
    oneTimeDesc: "This paste can only be viewed once. Opening it will permanently delete it.",
    reveal: "Reveal and destroy",
    destroyed: "This content has now been destroyed.",
    decrypting: "Decrypting…",
    missingKeyTitle: "Encryption key is missing.",
    missingKeyDesc:
      "There is no decryption key in the URL fragment (#k=…). The key is never stored on the server, so the content cannot be recovered.",
    wrongKeyTitle: "Unable to decrypt this paste.",
    wrongKeyDesc: "The key is incorrect or the data is corrupted.",
    notFoundTitle: "Paste not found",
    notFoundDesc: "This paste does not exist, has expired, or has already been consumed.",
    notFoundCreate: "Create a new paste",
    chipLanguage: "Language",
    chipExpires: "Expires",
  },
  ko: {
    navNew: "새 paste",
    tagline: "Ephemeral · Private · Disposable — 개발자용 보안 텍스트 공유",
    homeHeading: "새 보안 paste 만들기",
    content: "내용",
    placeholder: "코드, 로그, 텍스트를 붙여넣으세요…",
    expiration: "만료 시간",
    secret: "시크릿 암호화",
    burn: "읽으면 소각",
    language: "언어",
    create: "보안 paste 만들기",
    errEmpty: "내용을 입력하세요.",
    errTooLarge: (n: number) => `내용이 너무 큽니다 (최대 ${n} KiB).`,
    errEncryptTooLarge: "암호화 후 크기가 한도를 초과합니다.",
    errRateLimited: "요청이 너무 많습니다. 잠시 후 다시 시도하세요.",
    errCreateFailed: "생성 실패: ",
    resultTitle: "paste 생성 완료",
    expiresAt: "만료 시각",
    encrypted: "암호화",
    burnAfterRead: "읽으면 소각",
    yes: "예",
    no: "아니오",
    copyLink: "링크 복사",
    copied: "링크가 복사되었습니다.",
    copyFallback: "자동 복사 실패 — URL을 선택해 직접 복사하세요.",
    open: "열기",
    keyWarning:
      "이 URL에는 복호화 키(#k=…)가 포함되어 있습니다. URL을 잃어버리면 내용을 복구할 수 없습니다.",
    oneTimeTitle: "일회용 paste",
    oneTimeDesc: "한 번만 볼 수 있는 paste입니다. 열면 영구 삭제됩니다.",
    reveal: "열고 영구 삭제",
    destroyed: "내용이 열람과 동시에 파괴되었습니다.",
    decrypting: "복호화 중…",
    missingKeyTitle: "복호화 키가 없습니다.",
    missingKeyDesc:
      "URL 조각(#k=…)에 복호화 키가 없습니다. 키는 서버에 저장되지 않으므로 내용을 복구할 수 없습니다.",
    wrongKeyTitle: "paste를 복호화할 수 없습니다.",
    wrongKeyDesc: "키가 올바르지 않거나 데이터가 손상되었습니다.",
    notFoundTitle: "paste를 찾을 수 없음",
    notFoundDesc: "존재하지 않거나 만료되었거나 이미 소모된 paste입니다.",
    notFoundCreate: "새 paste 만들기",
    chipLanguage: "언어",
    chipExpires: "만료",
  },
} as const;

export type StringKey = Exclude<keyof (typeof STRINGS)["en"], number | symbol>;

let current: Lang = detect();

function detect(): Lang {
  const saved = localStorage.getItem("lang");
  if (saved === "ko" || saved === "en") return saved;
  return navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

/** 문자열 조회. 함수형 키(파라미터 필요)는 타입이 안 맞아 컴파일로 걸린다. */
export function t(key: StringKey): string {
  const value = STRINGS[current][key];
  return typeof value === "string" ? value : key;
}

/** 파라미터가 필요한 키용 */
export function tf(key: "errTooLarge", n: number): string {
  return STRINGS[current][key](n);
}

export function lang(): Lang {
  return current;
}

export function setLang(next: Lang): void {
  current = next;
  localStorage.setItem("lang", next);
  document.documentElement.lang = next;
}

export function initLang(): void {
  document.documentElement.lang = current;
}

/** 헤더의 KO/EN 토글 버튼을 만들고 이벤트를 연결한다. 클릭 시 저장 후 새로고침. */
export function mountLangToggle(container: HTMLElement): void {
  const make = (code: Lang, label: string) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-toggle";
    btn.textContent = label;
    btn.setAttribute("aria-pressed", String(current === code));
    if (current === code) btn.classList.add("active");
    btn.addEventListener("click", () => {
      if (current !== code) {
        setLang(code);
        window.location.reload();
      }
    });
    container.append(btn);
  };
  make("en", "EN");
  make("ko", "KO");
}
