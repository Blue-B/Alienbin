// 초경량 ko/en 다국어. 라이브러리 없이 사전 객체 + t() 헬퍼만 사용한다.
// 언어 결정 우선순위: localStorage > navigator.language > en
export type Lang = "en" | "ko";

const STRINGS = {
  en: {
    navNew: "New paste",
    feat1Title: "The link is the key",
    feat1Desc: "Encryption happens in your browser. The server never stores plaintext.",
    feat2Title: "Expires by time or views",
    feat2Desc: "Set a deadline or a read limit. Whichever ends first deletes the paste.",
    feat3Title: "No accounts, no tracking",
    feat3Desc: "Send only what matters, without sign-up, ads, or visitor tracking.",
    content: "Content",
    placeholder: "Paste your code, log, or text here…",
    expiration: "Expiration",
    settingsTitle: "Link settings",
    settingsDesc: "Choose when it expires and who can open it.",
    secret: "Secret encryption",
    readLimit: "Read limit",
    securityLegend: "Security",
    limitUnlimited: "Unlimited",
    limitOnceHint:
      "Opens once, then it's deleted immediately. If many people open it at the same time, only the first one sees it.",
    limitMultiHint: (n: number) =>
      `Opens up to ${n} times. It disappears when the reads run out or it expires.`,
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
    resultLimit: "Read limit",
    yes: "Yes",
    no: "No",
    copyLink: "Copy link",
    copied: "Link copied to clipboard.",
    copyFallback: "Automatic copy failed — select the URL and copy it manually.",
    open: "Open",
    keyWarning:
      "This link contains the key. Save it — if you lose it, the content can't be recovered.",
    oneTimeTitle: "One-time paste",
    limitTitle: "Read-limited paste",
    oneTimeDesc: "This link can be opened once. After that it's gone for good.",
    multiDesc: (n: number) =>
      `This link can be opened up to ${n} times. Each view uses one of them.`,
    burnCountLabel: "Read limit",
    reads: (n: number) => `${n} time${n > 1 ? "s" : ""}`,
    readsLeft: (n: number) => `${n} read${n > 1 ? "s" : ""} left`,
    reveal: "Open once",
    destroyed: "That was the last view. This content is now gone.",
    decrypting: "Decrypting…",
    missingKeyTitle: "This link is missing its key.",
    missingKeyDesc:
      "Encrypted content can only be opened with the key inside the link. Ask the sender for the original link.",
    wrongKeyTitle: "Unable to decrypt this paste.",
    wrongKeyDesc: "This link's key doesn't match. Double-check the original link.",
    notFoundTitle: "Paste not found",
    notFoundDesc: "This paste does not exist, has expired, or has already been consumed.",
    notFoundCreate: "Create a new paste",
    chipLanguage: "Language",
    chipExpires: "Expires",
    navAbout: "About",
    aboutTitle: "What is Alienbin?",
    aboutIntro:
      "An anonymous text-sharing service for developers. Paste code, logs, or notes, get a link, and every paste deletes itself when its time is up.",
    aboutFeaturesTitle: "What it does well",
    featAnon: "No account, no name — share without revealing who you are.",
    featCode: "Syntax highlighting and TAB indentation for snippets and scripts.",
    featPrivate: "Optional client-side encryption and one-time links for secrets.",
    freeTitle: "Is it free?",
    freeDesc:
      "Yes. Alienbin runs entirely on Cloudflare's free tier — no ads, no tracking, no payment.",
    privacyTitle: "Privacy",
    privacyDesc:
      "No personal information, no IP addresses in our database or logs, no visit tracking. With Secret mode the server never even sees your plaintext, and expired pastes are deleted automatically.",
    contactTitle: "Questions or problems?",
    contactDesc: "Open an issue on GitHub.",
    secretExplainer:
      "The content is stored encrypted. The key travels inside the link, so only people with the link can read it — not even the server. If you lose the link, the content can't be recovered.",
  },
  ko: {
    navNew: "새 paste",
    feat1Title: "링크 자체가 열쇠",
    feat1Desc: "브라우저에서 암호화한 뒤 저장합니다. 서버에는 평문이 남지 않습니다.",
    feat2Title: "시간 또는 횟수로 소멸",
    feat2Desc: "만료 시각과 열람 횟수 중 먼저 끝나는 조건에 맞춰 삭제됩니다.",
    feat3Title: "계정도 추적도 없음",
    feat3Desc: "가입, 광고, 방문 추적 없이 필요한 내용만 전달합니다.",
    content: "내용",
    placeholder: "공유할 코드나 로그를 붙여넣어 보세요…",
    expiration: "만료 시간",
    settingsTitle: "링크 설정",
    settingsDesc: "만료와 열람 조건을 정한 뒤 링크를 만드세요.",
    secret: "비밀글 암호화",
    readLimit: "열람 제한",
    securityLegend: "보안 옵션",
    limitUnlimited: "무제한",
    limitOnceHint: "한 번 열면 바로 삭제돼요. 여러 명이 동시에 열어도 처음 한 명만 볼 수 있어요.",
    limitMultiHint: (n: number) =>
      `최대 ${n}번 열 수 있어요. 횟수를 다 쓰거나 만료되면 사라집니다.`,
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
    resultLimit: "열람 제한",
    yes: "켜짐",
    no: "꺼짐",
    copyLink: "링크 복사",
    copied: "복사 완료!",
    copyFallback: "자동 복사가 안 됐어요. URL을 직접 선택해서 복사해 주세요.",
    open: "열어보기",
    keyWarning: "이 링크에 열쇠가 들어 있어요. 잃어버리면 내용을 복구할 수 없으니 꼭 보관하세요.",
    oneTimeTitle: "일회용 paste",
    limitTitle: "열람 제한 paste",
    oneTimeDesc: "이 링크는 딱 한 번 열 수 있어요. 열고 나면 완전히 사라집니다.",
    multiDesc: (n: number) =>
      `이 링크는 최대 ${n}번까지 열 수 있어요. 열 때마다 횟수가 차감됩니다.`,
    burnCountLabel: "열람 횟수",
    reads: (n: number) => `${n}회`,
    readsLeft: (n: number) => `남은 열람 ${n}회`,
    reveal: "한 번만 열기",
    destroyed: "마지막 열람이었어요. 이 내용은 이제 사라졌습니다.",
    decrypting: "풀어오는 중…",
    missingKeyTitle: "열쇠가 없는 링크예요.",
    missingKeyDesc:
      "암호화된 내용은 링크 안의 열쇠가 있어야만 볼 수 있어요. 내용을 보내준 사람에게 원래 링크를 다시 받아 와 주세요.",
    wrongKeyTitle: "내용을 열 수 없어요.",
    wrongKeyDesc: "링크의 열쇠가 맞지 않아요. 원래 링크를 다시 확인해 주세요.",
    notFoundTitle: "없는(혹은 사라진) paste예요",
    notFoundDesc: "주소가 잘못됐거나, 만료됐거나, 누군가 이미 읽어서 사라진 paste입니다.",
    notFoundCreate: "새 paste 만들기",
    chipLanguage: "언어",
    chipExpires: "만료",
    navAbout: "소개",
    aboutTitle: "Alienbin이 뭐 하는 곳이야?",
    aboutIntro:
      "개발자를 위한 익명 텍스트 공유 서비스예요. 코드, 로그, 메모를 붙여넣어 링크를 받고, 만료 시간이 지나면 저절로 사라집니다.",
    aboutFeaturesTitle: "이런 점이 좋아요",
    featAnon: "회원가입도 이름도 없어요. 누구인지 드러내지 않고 공유할 수 있습니다.",
    featCode: "코드 하이라이팅과 TAB 들여쓰기를 지원해요.",
    featPrivate: "필요하면 브라우저 암호화와 일회용 링크로 비밀도 안전하게.",
    freeTitle: "무료인가요?",
    freeDesc: "네. Cloudflare 무료 플랜 위에서 돌아가기 때문에 광고도, 추적도, 결제도 없습니다.",
    privacyTitle: "개인정보 처리 방식",
    privacyDesc:
      "개인정보를 수집하지 않고, IP 주소를 DB나 로그에 저장하지 않고, 방문 기록을 추적하지 않습니다. 시크릿 모드에서는 서버가 평문을 아예 보지 못하고, 만료된 paste는 자동으로 삭제돼요.",
    contactTitle: "궁금한 점이나 문제가 있으면",
    contactDesc: "GitHub 이슈로 알려 주세요.",
    secretExplainer:
      "내용이 암호화된 상태로 저장돼요. 열쇠는 링크에 붙어서 나가기 때문에 링크를 받은 사람만 볼 수 있고, 서버도 내용을 볼 수 없어요. 대신 링크를 잃어버리면 복구할 수 없으니 주의하세요.",
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
export type FnKey = "errTooLarge" | "multiDesc" | "limitMultiHint" | "reads" | "readsLeft";

export function tf(key: FnKey, n: number): string {
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
    // Body.append(workers-types)와의 타입 충돌을 피하려고 insertAdjacentElement 사용
    container.insertAdjacentElement("beforeend", btn);
  };
  make("en", "EN");
  make("ko", "KO");
}
