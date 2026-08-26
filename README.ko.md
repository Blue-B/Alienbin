# Alienbin

<!-- 히어로: 11초 데모 GIF. 흐름: 코드 입력, 만료·열람 제한 선택, 생성, 확인 화면, 하이라이팅된 본문 공개. -->
<p align="center">
  <img src="docs/assets/demo.gif" alt="Alienbin 데모: 열람 제한 paste 생성, 링크 공유, 하이라이팅된 본문 열람" width="820">
</p>

<p align="center">
  <a href="https://github.com/Blue-B/Alienbin/actions/workflows/ci.yml"><img src="https://github.com/Blue-B/Alienbin/actions/workflows/ci.yml/badge.svg" alt="CI 상태"></a>
  <a href="https://alienbin.foliyo.workers.dev"><img src="https://img.shields.io/badge/demo-live-2A3438" alt="라이브 데모"></a>
</p>

**브라우저 암호화를 갖춘 만료식 파스티빈.** 코드, 로그, 설정을 링크로 공유하면 정해진 시간이나 열람 횟수가 끝나는 대로 사라집니다. 계정도, 추적도, 서버 유지비도 없습니다. Cloudflare Workers 무료 범위 안에서 동작합니다.

[라이브 데모](https://alienbin.foliyo.workers.dev) · [English](README.md) · [보안 정책](SECURITY.md)

<!-- 이 파일은 짧게 유지한다. 자세한 내용은 docs/에 둔다. -->

## 기능

- **paste별 만료** (30초~7일), 정리 작업과 무관하게 모든 조회에서 강제됩니다
- **열람 제한** (1/3/5/10회) 원자적으로 소비되며, 동시에 열어도 횟수를 넘을 수 없습니다
- **시크릿 모드**: 브라우저에서 AES-GCM 암호화합니다. 키는 URL fragment에만 있고 서버로 전송되지 않습니다
- **개발자 편집기**: 구문 강조, 줄번호, TAB 들여쓰기, 한국어·영어 UI, CLI 클라이언트
- **기본으로 강화된 보안**: 엄격한 CSP, prepared statement 전용, 요청 제한, Turnstile
- **고정비 0원**: Worker 하나와 D1만으로 운영됩니다

> v1은 컬렉션 단위 TTL 버그가 있었고 [CVE-2026-31827](https://github.com/Blue-B/Alienbin/security/advisories/GHSA-hqvr-6v89-gwff)로 공개됐습니다. v2는 이 교훈을 기준으로 다시 만들었습니다: [docs/legacy-analysis.md](docs/legacy-analysis.md)

## 사용법

웹: 텍스트를 붙여넣고 만료와 열람 제한을 고른 뒤 링크를 공유합니다. 시크릿 링크는 복호화 키를 fragment에 담고 있습니다.

CLI (웹과 같은 API를 사용합니다):

```bash
cat error.log | alienbin --expire 1h
alienbin app.py --secret --once --expire 10m
# → https://<host>/p/<id>#k=<secret>
```

## 개발

```bash
npm install
cp .dev.vars.example .dev.vars   # Turnstile 공식 테스트 키
npm run dev                      # 로컬 D1 마이그레이션 + wrangler dev
npm test                         # 29개 테스트: 단위, 통합, 보안, 동시성
npm run deploy
```

## 문서

| 문서 | 내용 |
|---|---|
| [아키텍처](docs/architecture.md) | 시스템 구성도, 모듈 구조, 데이터 흐름 |
| [보안 설계](docs/security-design.md) | 위협 모델, 대응, 남은 위험 |
| [운영](docs/operations.md) | 무료 한도, 비용 구조, 운영 절차 |
| [마이그레이션](docs/migration.md) | 기존 데이터를 옮기지 않은 이유 |
| [ADR](docs/adr/) | 결정 기록 5편, 파일 업로드 보류 포함 |
| [v1 분석](docs/legacy-analysis.md) | v1 회고와 CVE 원인 |
