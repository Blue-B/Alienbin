# Alienbin

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![EJS](https://img.shields.io/badge/EJS-B4CA65?style=for-the-badge&logo=ejs&logoColor=black)](https://ejs.co/)

> 우주 어디서든 텍스트를 공유하는 새로운 차원의 플랫폼

Alienbin은 Pastebin에서 영감을 받아 제작된 익명 텍스트 공유 플랫폼입니다. 간단하고 빠른 텍스트 공유부터 코드 스니펫까지, 우주 정거장처럼 다양한 아이디어와 정보를 저장하고 공유할 수 있습니다.

## Demo

![Alienbin Preview](https://github.com/Blue-B/Alienbin/assets/55532956/5a8929b8-7ae8-430c-9305-10e97df575b3)

**Try it live: [https://alienbin.com](https://alienbin.com)**

## Features

- **간편한 텍스트 업로드** - 코드, 메모, 링크 등 어떤 형태의 텍스트든 쉽게 업로드
- **우주 어디서든 공유** - 생성된 고유 URL을 통해 전 세계 즉시 공유
- **안전한 만료 시간 설정** - 30초부터 7일까지 다양한 만료 옵션
- **문법 강조** - Highlight.js를 통한 다양한 프로그래밍 언어 지원
- **완전한 익명성** - 회원가입 없이 자유롭게 사용
- **자동완성** - TAB키를 통한 들여쓰기 기능
- **반응형 디자인** - 모든 디바이스에서 완벽한 사용자 경험

## Tech Stack

| Technology | Purpose |
|------------|---------|
| ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white) | JavaScript 런타임 환경 |
| ![Express.js](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white) | 웹 애플리케이션 프레임워크 |
| ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white) | NoSQL 데이터베이스 |
| ![EJS](https://img.shields.io/badge/EJS-B4CA65?style=flat&logo=ejs&logoColor=black) | 템플릿 엔진 |

### Key Dependencies

- **Web Framework**: `express`
- **Database**: `mongodb`, `mongoose`
- **Template Engine**: `ejs`
- **Environment**: `dotenv`
- **Development**: `nodemon`

## Getting Started

### Prerequisites

- Node.js 14 or higher
- MongoDB database
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/Blue-B/Alienbin.git
   cd Alienbin
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create environment file
   ```bash
   # .env
   NODE_ENV=production
   PORT=3000
   DB_URL='your_mongodb_connection_string'
   ```

4. Start the server
   ```bash
   npm start
   # or for development
   npx nodemon server.js
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **텍스트 입력** - 메인 페이지에서 공유하고 싶은 텍스트나 코드를 입력
2. **만료 시간 선택** - 30초부터 7일까지 원하는 만료 시간 설정
3. **공유** - 생성된 고유 URL을 복사하여 어디든 공유
4. **자동 삭제** - 설정한 시간이 지나면 자동으로 삭제

### Expiration Options

- 30초, 1분, 10분, 30분
- 1시간, 3시간
- 1일, 7일

## Project Structure

```
Alienbin/
├── server.js              # 메인 서버 파일
├── package.json            # 프로젝트 설정 및 의존성
├── public/                 # 정적 파일
│   ├── style.css          # 메인 스타일시트
│   ├── about.css          # 소개 페이지 스타일
│   └── logo.png           # 로고 이미지
├── views/                  # EJS 템플릿
│   ├── new.ejs            # 메인 페이지
│   ├── display.ejs        # 텍스트 표시 페이지
│   ├── about.ejs          # 소개 페이지
│   ├── nav.ejs            # 네비게이션 컴포넌트
│   └── _button.ejs        # 버튼 컴포넌트
└── README.md
```

## API Reference

### POST /save

텍스트를 저장하고 고유 ID를 생성합니다.

**Body Parameters:**
- `value` - 저장할 텍스트 내용
- `ttlOption` - 만료 시간 옵션 (30s, 1m, 10m, 30m, 1h, 3h, 1day, 7day)

**Response:** 생성된 게시물의 고유 URL로 리디렉션

### GET /display/:id

저장된 텍스트를 조회합니다.

**Path Parameters:**
- `id` - 게시물의 고유 식별자

**Response:** 텍스트 내용이 포함된 표시 페이지

## Contributing

기여를 환영합니다! 다음과 같이 참여할 수 있습니다:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Node.js 및 Express.js 모범 사례 준수
- MongoDB 쿼리 최적화
- EJS 템플릿 구조 유지
- 명확한 커밋 메시지 작성

## Support the Project

Alienbin이 도움이 되었다면 개발을 지원해주세요!

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-EA4AAA?style=for-the-badge&logo=github-sponsors&logoColor=white)](https://github.com/sponsors/Blue-B)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/beckycode7h)

여러분의 지원이 Alienbin을 더욱 발전시킵니다.

## Blog

더 자세한 정보: [개발 블로그](https://newstroyblog.tistory.com/519)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Express.js](https://expressjs.com/) for the robust web framework
- [MongoDB](https://www.mongodb.com/) for flexible data storage
- [EJS](https://ejs.co/) for powerful templating
- [Highlight.js](https://highlightjs.org/) for syntax highlighting

---

<div align="center">

**Made with ❤️ by [Blue-B](https://github.com/Blue-B)**

If you found this project helpful, please consider giving it a ⭐

</div>
