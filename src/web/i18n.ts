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
    tagline: "올리고, 나누고, 저절로 사라진다. 개발자의 보안 텍스트 공유",
    homeHeading: "paste 만들기",
    content: "내용",
    placeholder: "공유할 코드나 로그를 붙여넣어 보세요…",
    expiration: "만료 시간",
    secret: "비밀글 암호화",
    burn: "읽으면 소각",
    language: "언어",
    create: "보안 paste 만들기",
    errEmpty: "내용이 비어 있어요. 붙여넣은 게 있는지 확인해 주세요.",
    errTooLarge: (n: number) => `내용이 너무 길어요. 최대 ${n} KiB까지 지원합니다.`,
    errEncryptTooLarge: "암호화하느라 용량이 한도를 넘었어요. 내용을 조금 줄여 보세요.",
    errRateLimited: "요청이 몰려서 잠시 막혀 있어요. 조금 뒤에 다시 시도해 주세요.",
    errCreateFailed: "만들기 실패: ",
    resultTitle: "링크가 준비됐어요",
    expiresAt: "만료 시각",
    encrypted: "암호화",
    burnAfterRead: "읽으면 소각",
    yes: "켜짐",
    no: "꺼짐",
    copyLink: "링크 복사",
    copied: "복사 완료!",
    copyFallback: "자동 복사가 안 됐어요. URL을 직접 선택해서 복사해 주세요.",
    open: "열어보기",
    keyWarning:
      "이 링크 안에 복호화 키(#k=…)가 숨어 있어요. 링크를 잃어버리면 내용을 되살릴 방법이 없으니 꼭 보관하세요.",
    oneTimeTitle: "일회용 paste",
    oneTimeDesc: "이 paste는 딱 한 번만 열 수 있어요. 열리는 순간 서버에서도 사라집니다.",
    reveal: "한 번만 열기",
    destroyed: "확인했으니 이제 사라졌어요. 새로고침해도 다시 볼 수 없습니다.",
    decrypting: "풀어오는 중…",
    missingKeyTitle: "열쇠(#k=)가 없는 링크예요.",
    missingKeyDesc:
      "이 링크에는 암호화 키가 빠져 있어요. 키는 서버에 저장되지 않기 때문에, 원래 링크를 받아야만 내용을 볼 수 있습니다.",
    wrongKeyTitle: "내용을 열 수 없어요.",
    wrongKeyDesc: "링크의 키가 맞지 않거나 데이터가 손상된 것 같아요.",
    notFoundTitle: "없는(혹은 사라진) paste예요",
    notFoundDesc: "주소가 잘못됐거나, 만료됐거나, 누군가 이미 읽어서 사라진 paste입니다.",
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
