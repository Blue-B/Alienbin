import { type Lang, lang } from "./i18n";

export type InfoPage = "about" | "privacy" | "terms" | "security";

interface InfoLink {
  label: string;
  href: string;
  external?: boolean;
}

interface InfoSection {
  title: string;
  paragraphs?: string[];
  facts?: [string, string][];
  items?: string[];
  links?: InfoLink[];
}

interface InfoCopy {
  label: string;
  title: string;
  summary: string;
  updated?: string;
  sections: InfoSection[];
}

const ROUTE_LABELS: Record<Lang, Record<InfoPage, string>> = {
  en: {
    about: "About",
    privacy: "Privacy",
    terms: "Terms",
    security: "Security",
  },
  ko: {
    about: "소개",
    privacy: "개인정보",
    terms: "이용약관",
    security: "보안",
  },
};

const COPY: Record<Lang, Record<InfoPage, InfoCopy>> = {
  en: {
    about: {
      label: "About",
      title: "About Alienbin",
      summary:
        "Alienbin shares code, logs, and notes for a time or read limit chosen by the sender.",
      sections: [
        {
          title: "Service scope",
          paragraphs: [
            "No account is required. A sender pastes text, chooses its expiration and read limit, then shares the generated link.",
            "Alienbin currently handles text only. It is not a file host, backup service, or permanent document store.",
          ],
          facts: [
            ["Payload limit", "256 KiB plain, 320 KiB encrypted"],
            ["Expiration", "30 seconds to 7 days"],
            ["Read limits", "Unlimited, 1, 3, 5, or 10 reads"],
            ["Interface", "Korean and English"],
          ],
        },
        {
          title: "Plain and Secret modes",
          paragraphs: [
            "Plain mode stores the submitted text in D1 until it expires. Use it for code, logs, and notes that do not need client-side encryption.",
            "Secret mode encrypts text in the browser with AES-GCM. D1 stores ciphertext and an access proof. The key stays in the URL fragment and is not sent to the Worker.",
          ],
        },
        {
          title: "Expiration and deletion",
          paragraphs: [
            "Every read checks the paste expiration in its D1 query. The paste becomes inaccessible at its deadline even if maintenance has not run.",
            "An hourly Cron Trigger removes expired rows from the active database. Cloudflare D1 Time Travel can retain recoverable database history for up to 7 days on the Free plan.",
          ],
        },
        {
          title: "Operation",
          paragraphs: [
            "Alienbin has no advertising or visitor analytics. Cloudflare provides hosting, rate limiting, and Turnstile bot checks.",
            "The source code and security design are public. General questions belong in GitHub Issues. Security reports use GitHub private vulnerability reporting.",
          ],
          links: [
            { label: "Source code", href: "https://github.com/Blue-B/Alienbin", external: true },
            {
              label: "Report a vulnerability",
              href: "https://github.com/Blue-B/Alienbin/security/advisories/new",
              external: true,
            },
          ],
        },
      ],
    },
    privacy: {
      label: "Policy",
      title: "Privacy notice",
      summary:
        "This page describes what Alienbin processes, why it is needed, and when it is deleted.",
      updated: "Last updated: 2026-08-25",
      sections: [
        {
          title: "Scope",
          paragraphs: [
            "This notice applies to the Alienbin website, API, and command-line client operated through this project. Alienbin does not require an account, name, email address, or payment information.",
          ],
        },
        {
          title: "Data processed",
          facts: [
            ["Paste data", "Plaintext in Plain mode, ciphertext in Secret mode"],
            [
              "Paste metadata",
              "ID, language, creation time, expiration, encryption flag, and read count",
            ],
            [
              "Network signals",
              "IP address and browser signals processed for rate limiting and Turnstile",
            ],
            ["Local preference", "The selected interface language stored in browser localStorage"],
          ],
          paragraphs: [
            "The application does not write raw IP addresses to D1 or application logs. Cloudflare processes network and browser signals to deliver the service, apply rate limits, and operate Turnstile.",
          ],
        },
        {
          title: "Purpose",
          items: [
            "Create and deliver expiring paste links.",
            "Enforce expiration and read limits.",
            "Prevent automated abuse and protect service capacity.",
            "Diagnose failures without logging paste bodies, keys, access proofs, or Turnstile tokens.",
          ],
        },
        {
          title: "Retention and deletion",
          paragraphs: [
            "A paste becomes inaccessible as soon as its expiration condition fails. One-time pastes are deleted from the active database by the successful consume operation. Other expired or exhausted rows are removed by the hourly cleanup job.",
            "Cloudflare D1 Time Travel is enabled by default and retains restore history for up to 7 days on the Free plan. Infrastructure telemetry follows Cloudflare's own retention policies.",
            "Alienbin does not currently provide early deletion or account-based recovery. Choose a short expiration when the retention period matters.",
          ],
        },
        {
          title: "Service providers",
          paragraphs: [
            "Cloudflare provides Workers, Static Assets, D1, Rate Limiting, and Turnstile. Cloudflare may process service and network data through its global infrastructure under its own privacy terms.",
          ],
          links: [
            {
              label: "Cloudflare privacy policy",
              href: "https://www.cloudflare.com/privacypolicy/",
              external: true,
            },
            {
              label: "Turnstile privacy policy",
              href: "https://www.cloudflare.com/turnstile-privacy-policy/",
              external: true,
            },
          ],
        },
        {
          title: "Contact and changes",
          paragraphs: [
            "General privacy questions can be opened in GitHub Issues. Do not include paste text, complete secret links, encryption keys, or personal information in a public issue.",
            "Material changes to this notice will be published at this URL with a revised date.",
          ],
          links: [
            {
              label: "GitHub Issues",
              href: "https://github.com/Blue-B/Alienbin/issues",
              external: true,
            },
          ],
        },
      ],
    },
    terms: {
      label: "Policy",
      title: "Terms of use",
      summary:
        "Alienbin is a temporary text-sharing service. It is not a permanent or guaranteed store.",
      updated: "Last updated: 2026-08-25",
      sections: [
        {
          title: "Using the service",
          paragraphs: [
            "You may use Alienbin to share text that you are allowed to possess and distribute. You are responsible for the content you submit and for every person who receives the link.",
          ],
        },
        {
          title: "Prohibited use",
          items: [
            "Illegal content or material that violates another person's rights.",
            "Malware, credential theft, phishing, spam, or attempts to compromise another system.",
            "Automated flooding, quota exhaustion, access-control bypass, or interference with other users.",
            "Personal, medical, financial, or authentication data when disclosure could cause harm.",
          ],
        },
        {
          title: "Links and encryption keys",
          paragraphs: [
            "Anyone with a Plain paste link can request its content until it expires or reaches its read limit. A complete Secret link contains the decryption key and must be handled like the content itself.",
            "Alienbin cannot recover a lost Secret link or encryption key. Link previews, browser history, screenshots, and messaging services may expose a link to other people.",
          ],
        },
        {
          title: "Deletion and availability",
          paragraphs: [
            "Pastes can disappear because of expiration, read-limit exhaustion, abuse handling, operational failure, or service changes. Do not use Alienbin as the only copy of important information.",
            "The service is provided without a promise of uninterrupted availability, permanent retention, recovery, or fitness for a particular purpose.",
          ],
        },
        {
          title: "Enforcement and changes",
          paragraphs: [
            "Requests may be rate-limited or blocked to protect the service. Content may be removed when required by law, when it creates operational risk, or when it violates these terms.",
            "Changes to these terms will be published at this URL with a revised date. Continuing to use the service after a change means the current terms apply to new pastes.",
          ],
          links: [
            {
              label: "General questions",
              href: "https://github.com/Blue-B/Alienbin/issues",
              external: true,
            },
          ],
        },
      ],
    },
    security: {
      label: "Trust",
      title: "Security model",
      summary:
        "The security boundary depends on the selected mode, the full link, and the browser code served at the time of use.",
      updated: "Last reviewed: 2026-08-25",
      sections: [
        {
          title: "What the server stores",
          facts: [
            ["Plain mode", "Submitted text and paste metadata"],
            ["Secret mode", "AES-GCM ciphertext, metadata, and SHA-256 access proof"],
            ["Secret key", "URL fragment only, never stored in D1"],
            ["Paste ID", "22-character base64url value from 16 random bytes"],
          ],
        },
        {
          title: "Secret mode",
          items: [
            "The browser creates a fresh 256-bit key and encrypts the text with AES-GCM.",
            "The Worker receives ciphertext and SHA-256 of the key as an access proof.",
            "The key is placed after the URL fragment marker, which browsers do not send in HTTP requests.",
            "The receiving browser presents the proof, downloads ciphertext, and decrypts locally.",
          ],
        },
        {
          title: "Expiration and read limits",
          paragraphs: [
            "Every metadata and content query rejects expired rows. A one-time paste uses an atomic DELETE with RETURNING, so concurrent readers cannot both receive the payload.",
            "Read-limited pastes update their counter in one D1 statement. A crawler cannot consume a limited paste with a normal GET request because consumption requires an explicit POST.",
          ],
        },
        {
          title: "What this protects",
          items: [
            "Database disclosure does not reveal Secret paste plaintext without its key.",
            "Prepared statements and strict ID validation reduce SQL injection risk.",
            "Text-only rendering, a restrictive Content Security Policy, and no inline scripts reduce stored XSS risk.",
            "Rate limiting and Turnstile reduce anonymous write abuse.",
          ],
        },
        {
          title: "Limits of the model",
          items: [
            "Plain mode content is visible to the server and anyone who obtains its link.",
            "Anyone with the complete Secret link can decrypt the paste.",
            "A compromised Worker deployment could serve modified JavaScript to future visitors.",
            "Browser history, extensions, screenshots, or messaging previews can expose a complete link.",
            "Alienbin does not scan content and must not be treated as a malware-safe transfer channel.",
          ],
        },
        {
          title: "Reporting vulnerabilities",
          paragraphs: [
            "Send security reports through GitHub private vulnerability reporting. Do not publish exploit details, paste contents, keys, or proof-of-concept links in a public issue.",
          ],
          links: [
            {
              label: "Private security report",
              href: "https://github.com/Blue-B/Alienbin/security/advisories/new",
              external: true,
            },
            {
              label: "Security policy",
              href: "https://github.com/Blue-B/Alienbin/blob/v2/SECURITY.md",
              external: true,
            },
          ],
        },
      ],
    },
  },
  ko: {
    about: {
      label: "소개",
      title: "Alienbin 소개",
      summary:
        "Alienbin은 코드, 로그, 메모를 정해진 시간이나 열람 횟수 동안만 공유하는 텍스트 도구입니다.",
      sections: [
        {
          title: "서비스 범위",
          paragraphs: [
            "회원가입 없이 텍스트를 붙여넣고 만료 시간과 열람 제한을 정한 뒤 링크로 공유합니다.",
            "현재는 텍스트만 지원합니다. 파일 저장소, 백업 서비스, 영구 문서 보관소로 사용할 수 없습니다.",
          ],
          facts: [
            ["본문 한도", "일반 256 KiB, 시크릿 320 KiB"],
            ["만료 범위", "30초부터 7일까지"],
            ["열람 제한", "무제한, 1회, 3회, 5회, 10회"],
            ["화면 언어", "한국어, 영어"],
          ],
        },
        {
          title: "일반 모드와 시크릿 모드",
          paragraphs: [
            "일반 모드는 입력한 텍스트를 만료 시각까지 D1에 평문으로 저장합니다. 클라이언트 암호화가 필요하지 않은 코드, 로그, 메모에 적합합니다.",
            "시크릿 모드는 브라우저에서 AES-GCM으로 암호화합니다. D1에는 암호문과 접근 증명만 저장하며, 복호화 키는 URL fragment에 남아 Worker로 전송되지 않습니다.",
          ],
        },
        {
          title: "만료와 삭제",
          paragraphs: [
            "모든 조회 쿼리가 만료 시각을 확인합니다. 정해진 시각이 지나면 정리 작업을 기다리지 않고 바로 접근할 수 없습니다.",
            "매시간 실행되는 Cron Trigger가 활성 데이터베이스에서 만료된 행을 삭제합니다. Cloudflare D1 Time Travel 복구 기록에는 Free 플랜 기준 최대 7일 동안 남을 수 있습니다.",
          ],
        },
        {
          title: "운영 방식",
          paragraphs: [
            "광고와 방문 분석 도구를 사용하지 않습니다. Cloudflare가 호스팅, 요청 제한, Turnstile 봇 검증을 제공합니다.",
            "소스 코드와 보안 설계는 공개되어 있습니다. 일반 문의는 GitHub Issues, 취약점 제보는 GitHub 비공개 보안 제보를 사용합니다.",
          ],
          links: [
            { label: "소스 코드", href: "https://github.com/Blue-B/Alienbin", external: true },
            {
              label: "취약점 제보",
              href: "https://github.com/Blue-B/Alienbin/security/advisories/new",
              external: true,
            },
          ],
        },
      ],
    },
    privacy: {
      label: "정책",
      title: "개인정보 처리방침",
      summary: "Alienbin이 처리하는 정보, 처리 목적, 삭제 시점을 설명합니다.",
      updated: "최근 수정: 2026-08-25",
      sections: [
        {
          title: "적용 범위",
          paragraphs: [
            "이 방침은 Alienbin 웹사이트, API, 명령줄 도구에 적용됩니다. Alienbin은 계정, 이름, 이메일 주소, 결제 정보를 요구하지 않습니다.",
          ],
        },
        {
          title: "처리하는 정보",
          facts: [
            ["paste 데이터", "일반 모드의 평문 또는 시크릿 모드의 암호문"],
            ["paste 메타데이터", "ID, 언어, 생성 시각, 만료 시각, 암호화 여부, 열람 횟수"],
            ["네트워크 신호", "요청 제한과 Turnstile에서 처리하는 IP 주소와 브라우저 신호"],
            ["로컬 설정", "브라우저 localStorage에 저장하는 화면 언어"],
          ],
          paragraphs: [
            "애플리케이션은 원본 IP 주소를 D1이나 애플리케이션 로그에 기록하지 않습니다. Cloudflare는 서비스 제공, 요청 제한, Turnstile 운영을 위해 네트워크와 브라우저 신호를 처리합니다.",
          ],
        },
        {
          title: "처리 목적",
          items: [
            "만료되는 paste 링크 생성과 전달",
            "만료 시간과 열람 제한 집행",
            "자동화된 남용 방지와 서비스 용량 보호",
            "paste 본문, 키, 접근 증명, Turnstile 토큰을 로그에 남기지 않는 범위의 장애 확인",
          ],
        },
        {
          title: "보관과 삭제",
          paragraphs: [
            "paste는 만료 조건을 충족하는 즉시 접근할 수 없습니다. 1회용 paste는 정상 열람과 함께 활성 데이터베이스에서 삭제되며, 그 밖의 만료 또는 소진된 행은 매시간 정리 작업에서 삭제됩니다.",
            "Cloudflare D1 Time Travel은 기본으로 활성화되며 Free 플랜에서 최대 7일의 복구 기록을 유지합니다. 인프라 원격 측정 데이터는 Cloudflare의 보관 정책을 따릅니다.",
            "현재 조기 삭제와 계정 기반 복구 기능은 제공하지 않습니다. 보관 시간이 중요하면 짧은 만료 시간을 선택해야 합니다.",
          ],
        },
        {
          title: "외부 서비스",
          paragraphs: [
            "Cloudflare는 Workers, Static Assets, D1, Rate Limiting, Turnstile을 제공합니다. Cloudflare는 자체 개인정보 처리 기준에 따라 전 세계 인프라에서 서비스와 네트워크 데이터를 처리할 수 있습니다.",
          ],
          links: [
            {
              label: "Cloudflare 개인정보 처리방침",
              href: "https://www.cloudflare.com/privacypolicy/",
              external: true,
            },
            {
              label: "Turnstile 개인정보 처리방침",
              href: "https://www.cloudflare.com/turnstile-privacy-policy/",
              external: true,
            },
          ],
        },
        {
          title: "문의와 변경",
          paragraphs: [
            "개인정보 관련 일반 문의는 GitHub Issues에 남길 수 있습니다. 공개 이슈에는 paste 본문, 전체 시크릿 링크, 암호화 키, 개인정보를 적지 마세요.",
            "중요한 변경 사항은 수정 날짜와 함께 이 주소에 공개합니다.",
          ],
          links: [
            {
              label: "GitHub Issues",
              href: "https://github.com/Blue-B/Alienbin/issues",
              external: true,
            },
          ],
        },
      ],
    },
    terms: {
      label: "정책",
      title: "이용약관",
      summary: "Alienbin은 임시 텍스트 공유 서비스이며 영구 보관과 복구를 보장하지 않습니다.",
      updated: "최근 수정: 2026-08-25",
      sections: [
        {
          title: "서비스 이용",
          paragraphs: [
            "이용자는 보유하고 배포할 권한이 있는 텍스트를 공유할 수 있습니다. 입력한 내용과 링크를 전달받는 사람에 대한 책임은 이용자에게 있습니다.",
          ],
        },
        {
          title: "금지 행위",
          items: [
            "불법 콘텐츠 또는 타인의 권리를 침해하는 자료 게시",
            "악성 코드, 자격 증명 탈취, 피싱, 스팸, 다른 시스템에 대한 공격",
            "자동화된 대량 요청, 할당량 소진, 접근 통제 우회, 다른 이용자 방해",
            "노출될 경우 피해가 생길 수 있는 개인정보, 의료 정보, 금융 정보, 인증 정보 공유",
          ],
        },
        {
          title: "링크와 암호화 키",
          paragraphs: [
            "일반 paste 링크를 가진 사람은 만료되거나 열람 횟수가 소진될 때까지 내용을 요청할 수 있습니다. 완전한 시크릿 링크에는 복호화 키가 포함되므로 본문과 같은 수준으로 관리해야 합니다.",
            "Alienbin은 잃어버린 시크릿 링크나 암호화 키를 복구할 수 없습니다. 링크 미리보기, 브라우저 기록, 화면 캡처, 메신저를 통해 링크가 다른 사람에게 노출될 수 있습니다.",
          ],
        },
        {
          title: "삭제와 가용성",
          paragraphs: [
            "paste는 만료, 열람 횟수 소진, 남용 대응, 운영 장애, 서비스 변경으로 사라질 수 있습니다. 중요한 정보의 유일한 사본을 Alienbin에 두면 안 됩니다.",
            "서비스의 중단 없는 제공, 영구 보관, 복구, 특정 목적에 대한 적합성을 보장하지 않습니다.",
          ],
        },
        {
          title: "이용 제한과 약관 변경",
          paragraphs: [
            "서비스를 보호하기 위해 요청을 제한하거나 차단할 수 있습니다. 법적 의무, 운영 위험, 약관 위반이 확인되면 콘텐츠를 삭제할 수 있습니다.",
            "변경된 약관은 수정 날짜와 함께 이 주소에 공개합니다. 변경 이후 새로 만든 paste에는 당시 약관이 적용됩니다.",
          ],
          links: [
            {
              label: "일반 문의",
              href: "https://github.com/Blue-B/Alienbin/issues",
              external: true,
            },
          ],
        },
      ],
    },
    security: {
      label: "신뢰",
      title: "보안 설계",
      summary:
        "보안 범위는 선택한 모드, 전체 링크 관리, 이용 시점에 제공된 브라우저 코드에 따라 달라집니다.",
      updated: "최근 검토: 2026-08-25",
      sections: [
        {
          title: "서버에 저장되는 정보",
          facts: [
            ["일반 모드", "입력한 텍스트와 paste 메타데이터"],
            ["시크릿 모드", "AES-GCM 암호문, 메타데이터, SHA-256 접근 증명"],
            ["시크릿 키", "URL fragment에만 존재하며 D1에 저장하지 않음"],
            ["paste ID", "16바이트 난수로 만든 22자 base64url 값"],
          ],
        },
        {
          title: "시크릿 모드 처리 과정",
          items: [
            "브라우저가 새로운 256비트 키를 만들고 AES-GCM으로 텍스트를 암호화합니다.",
            "Worker는 암호문과 키의 SHA-256 값을 접근 증명으로 받습니다.",
            "키는 URL fragment 뒤에 들어가며 브라우저가 HTTP 요청에 포함하지 않습니다.",
            "수신자의 브라우저가 접근 증명을 보내 암호문을 받은 뒤 로컬에서 복호화합니다.",
          ],
        },
        {
          title: "만료와 열람 제한",
          paragraphs: [
            "모든 메타데이터와 본문 조회는 만료된 행을 거부합니다. 1회용 paste는 DELETE RETURNING을 원자적으로 실행하므로 동시에 접근한 두 사람이 모두 본문을 받을 수 없습니다.",
            "열람 제한 paste는 하나의 D1 문장에서 횟수를 갱신합니다. 일반 GET으로는 소비할 수 없고 명시적인 POST 요청이 필요하므로 링크 미리보기와 검색 수집기가 횟수를 사용하지 않습니다.",
          ],
        },
        {
          title: "보호하는 범위",
          items: [
            "데이터베이스가 노출되어도 키가 없으면 시크릿 paste 평문을 확인할 수 없습니다.",
            "준비된 SQL 문과 엄격한 ID 검증으로 SQL injection 위험을 줄입니다.",
            "텍스트 전용 렌더링, 제한적인 Content Security Policy, 인라인 스크립트 금지로 저장형 XSS 위험을 줄입니다.",
            "요청 제한과 Turnstile로 익명 쓰기 남용을 줄입니다.",
          ],
        },
        {
          title: "보호하지 못하는 범위",
          items: [
            "일반 모드 본문은 서버와 링크를 확보한 사람이 볼 수 있습니다.",
            "완전한 시크릿 링크를 확보한 사람은 본문을 복호화할 수 있습니다.",
            "Worker 배포가 침해되면 이후 방문자에게 변조된 JavaScript를 전달할 수 있습니다.",
            "브라우저 기록, 확장 프로그램, 화면 캡처, 메신저 미리보기에서 전체 링크가 노출될 수 있습니다.",
            "Alienbin은 콘텐츠를 검사하지 않으므로 악성 파일이나 코드의 안전성을 보증하는 전달 경로가 아닙니다.",
          ],
        },
        {
          title: "취약점 제보",
          paragraphs: [
            "취약점은 GitHub 비공개 보안 제보로 보내 주세요. 공개 이슈에 공격 방법, paste 본문, 키, 재현 링크를 게시하지 마세요.",
          ],
          links: [
            {
              label: "비공개 보안 제보",
              href: "https://github.com/Blue-B/Alienbin/security/advisories/new",
              external: true,
            },
            {
              label: "보안 정책",
              href: "https://github.com/Blue-B/Alienbin/blob/v2/SECURITY.md",
              external: true,
            },
          ],
        },
      ],
    },
  },
};

type Attrs = Record<string, string>;

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function pageHref(page: InfoPage): string {
  return page === "about" ? "/about" : `/${page}`;
}

function linkNode(link: InfoLink): HTMLAnchorElement {
  const attrs: Attrs = { href: link.href, text: link.label };
  if (link.external) {
    attrs.target = "_blank";
    attrs.rel = "noreferrer";
  }
  return element("a", attrs);
}

function renderSection(copy: InfoSection): HTMLElement {
  const section = element("section", { class: "info-section" });
  section.append(element("h2", { text: copy.title }));
  for (const paragraph of copy.paragraphs ?? []) {
    section.append(element("p", { text: paragraph }));
  }
  if (copy.facts) {
    const facts = element("dl", { class: "info-facts" });
    for (const [term, description] of copy.facts) {
      facts.append(
        element("div", {}, element("dt", { text: term }), element("dd", { text: description })),
      );
    }
    section.append(facts);
  }
  if (copy.items) {
    section.append(
      element(
        "ul",
        { class: "info-list" },
        ...copy.items.map((item) => element("li", { text: item })),
      ),
    );
  }
  if (copy.links) {
    section.append(element("div", { class: "info-links" }, ...copy.links.map(linkNode)));
  }
  return section;
}

export function renderInfoPage(container: HTMLElement, page: InfoPage): void {
  const currentLang = lang();
  const copy = COPY[currentLang][page];
  container.replaceChildren();
  document.title = `${copy.title} | Alienbin`;
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (description) description.content = copy.summary;

  const pageNav = element("nav", {
    class: "info-page-nav",
    "aria-label": currentLang === "ko" ? "정보 페이지" : "Information pages",
  });
  for (const target of ["about", "privacy", "terms", "security"] as const) {
    const link = element("a", { href: pageHref(target), text: ROUTE_LABELS[currentLang][target] });
    if (target === page) link.setAttribute("aria-current", "page");
    pageNav.append(link);
  }

  const aside = element(
    "aside",
    { class: "info-aside" },
    element("img", {
      class: "info-mark",
      src: "/alien-mark.png",
      alt: currentLang === "ko" ? "Alienbin 외계인 마스코트" : "Alienbin alien mascot",
      width: "72",
      height: "72",
    }),
    element("p", { class: "info-kind", text: copy.label }),
    element("h1", { text: copy.title }),
    element("p", { class: "info-summary", text: copy.summary }),
    ...(copy.updated ? [element("p", { class: "info-updated", text: copy.updated })] : []),
    pageNav,
    element("a", {
      class: "info-home-link",
      href: "/",
      text: currentLang === "ko" ? "새 paste 만들기" : "Create a new paste",
    }),
  );

  const article = element("article", { class: "info-article" });
  for (const section of copy.sections) article.append(renderSection(section));
  article.append(
    element(
      "footer",
      { class: "info-footer" },
      element("span", { text: "Alienbin" }),
      element("a", {
        href: "https://github.com/Blue-B/Alienbin",
        target: "_blank",
        rel: "noreferrer",
        text: "GitHub",
      }),
    ),
  );

  container.append(element("div", { class: "info-layout" }, aside, article));
}
