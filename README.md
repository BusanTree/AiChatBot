# 로맨스 AI

Google의 **Gemini API (Gemma 3 27B IT)** 를 사용해 한국어 성인 창작 로맨스 대화를 나눌 수 있는 모바일 웹 앱입니다.

## 실행

```powershell
npm install
npm run dev
```

## 설정

### 1. Gemini API 키 (필수, 무료)

1. [Google AI Studio](https://aistudio.google.com/app/apikey) 에서 무료 API 키 발급
2. 앱 하단의 **설정 → Gemini 연결**에 키 입력
3. 기본 모델: `gemma-3-27b-it` (원하는 모델로 수정 가능)

키는 브라우저(localStorage)에만 저장됩니다.

### 2. Google 로그인 (선택, 무료)

로그인하면 구글 프로필 이름/사진이 자동으로 반영됩니다.

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 에서 프로젝트를 만들고 **OAuth 2.0 Client ID** 생성 (Web application)
2. Authorized JavaScript origins에 앱 주소를 등록 (개발: `http://localhost:5173`, 배포: `https://<사용자>.github.io` 등)
3. 발급된 Client ID를 앱의 **설정 → 계정** 에 붙여넣기
   - 또는 `.env` 파일에 `VITE_GOOGLE_CLIENT_ID=...` 로 지정

로그인 토큰은 브라우저에서만 디코딩되어 프로필 표시에만 쓰이며, 별도 서버로 전송되지 않습니다.

## 채팅 사용법

- **Enter** 전송 / **Shift+Enter** 줄바꿈
- `*시선을 피한다*` 처럼 별표 안은 상황 묘사
- `@박수아 오늘 무슨 생각했어?` 로 특정 인물이 직접 말하게 하기
- 채팅 화면의 `＋` 버튼으로 새 인물 추가 (AI가 설정 추천 가능)

## 데이터 보관

다음은 모두 **내 브라우저의 localStorage**에만 저장됩니다.

- Gemini API 키, 모델 이름, 닉네임
- 채팅 세션, 즐겨찾기, 직접 만든 캐릭터
- Google 로그인 프로필, Google Client ID

## 성인 대화 기준

성인 간 합의된 창작 대화는 허용합니다. 미성년자, 강압, 비동의, 불법 행위, 실제 개인을 대상으로 한 성적 묘사는 거절하도록 설계되어 있습니다.
