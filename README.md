# AI ChatBot

실사풍 캐릭터 랭킹 화면과 캐릭터별 대화를 제공하는 성인 창작용 AI 챗봇 웹 앱입니다.

## 실행 방법

```powershell
npm install
npm run dev
```

로컬에서 Ollama를 쓸 경우:

```powershell
ollama run huihui_ai/qwen3-abliterated:32b
```

32B 모델이 무거우면 앱의 마이페이지에서 더 가벼운 모델로 바꿔 테스트할 수 있습니다.

## 배포 후 AI 답변 연결

GitHub Pages는 웹앱을 무료로 올려주는 곳이고, 큰 LLM을 직접 실행하는 서버는 아닙니다.

배포된 앱에서 답변을 받으려면 앱의 마이페이지에서 `원격 API`를 선택한 뒤 OpenRouter 같은 OpenAI 호환 API의 키와 모델 이름을 입력하세요. 기본 모델 입력값은 `openrouter/auto`입니다.

## 성인 대화 기준

성인 간 합의된 창작 대화는 허용하는 방향으로 설계했습니다. 다만 미성년자, 강압, 비동의, 불법 행위, 실제 개인을 대상으로 한 성적 묘사는 다루지 않도록 안내 문구를 넣었습니다.
