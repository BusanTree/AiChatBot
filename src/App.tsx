import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import './App.css'

type Sender = 'user' | 'assistant' | 'system' | 'cast'
type Tab = 'home' | 'chats' | 'create' | 'my'
type ModelState = 'unknown' | 'checking' | 'ready' | 'missing' | 'offline' | 'error'
type ApiMode = 'local' | 'openrouter' | 'gemini'

type ChatMessage = {
  id: string
  sender: Sender
  text: string
  time: string
  speakerName?: string
  speakerImage?: string
}

type Character = {
  id: number
  rank: number
  views: string
  title: string
  subtitle: string
  tags: string[]
  author: string
  image: string
  job: string
  genre: string
  personality: string
  hobbies: string
  preference: string
  note: string
  tone: string
  intro: string
  speechGuide?: string
  openingScene?: string
  openingLine?: string
  gallery: CharacterPhoto[]
}

type CharacterPhoto = {
  image: string
  row: number
  col: number
  label: string
}

type PhotoPreview = {
  image: string
  label: string
  row?: number
  col?: number
}

type SuggestionPage = {
  id: string
  items: string[]
}

type CastMember = {
  id: string
  name: string
  job: string
  personality: string
  traits?: string
  relationship?: string
  hobbies?: string
  details: string
  image: string
}

const modelOptions = [
  {
    name: 'huihui_ai/qwen3-abliterated:32b',
    label: '최고 품질',
    note: '성인 창작 자유도와 품질 우선. PC 사양을 많이 탑니다.',
  },
  {
    name: 'huihui_ai/qwen3-abliterated:14b',
    label: '균형형',
    note: '32B가 무거울 때 추천하는 현실적인 선택입니다.',
  },
  {
    name: 'huihui_ai/qwen3-abliterated:8b',
    label: '빠른 테스트',
    note: '가볍게 연결과 응답을 확인할 때 좋습니다.',
  },
  {
    name: 'dolphin-mistral:7b',
    label: '응급용',
    note: '품질은 낮지만 PC에서 빨리 도는지 확인할 때만 씁니다.',
  },
  {
    name: 'gemma4:latest',
    label: '설치된 안정 모델',
    note: '로컬에서 답변 성공을 확인했습니다. 성인 창작 자유도는 낮을 수 있습니다.',
  },
  {
    name: 'deepseek-r1:14b',
    label: '추론형 설치 모델',
    note: '생각이 긴 편이라 캐릭터 채팅보다는 일반 답변 확인용입니다.',
  },
]

const categories = ['전체', '일상/로맨스', '오피스', '라운지', '연상/누나', '집착/피폐', '학원물', '로맨스 판타지', 'BL', '현대 판타지', '무협']
const rankTabs = ['트렌딩', '베스트', '신작']
const openRouterEndpoint = 'https://openrouter.ai/api/v1/chat/completions'
const geminiEndpointBase = 'https://generativelanguage.googleapis.com/v1beta/models'
const isLocalAddress = ['localhost', '127.0.0.1'].includes(window.location.hostname)
const gallerySheet = 'characters/gallery-sheet.png'
const allureGallerySheet = 'characters/allure-gallery-sheet.png'

function geminiEndpoint(model: string) {
  return `${geminiEndpointBase}/${encodeURIComponent(model)}:generateContent`
}

function galleryRow(row: number, labels: string[], image = gallerySheet): CharacterPhoto[] {
  return labels.map((label, col) => ({ image, row, col, label }))
}

const baseCharacters: Character[] = [
  {
    id: 1,
    rank: 1,
    views: '8,594',
    title: '너 처음만 아니었어?',
    subtitle: '가면을 쓴 독립운동가와 당신을 둘러싼 위험한 비밀',
    tags: ['순애', '시대극', '비밀'],
    author: 'dell1945',
    image: 'characters/character-1.png',
    job: '독립운동 연락책',
    genre: '일상/로맨스',
    personality: '차갑게 선을 긋지만 한번 믿은 사람은 끝까지 지키는 타입',
    hobbies: '밤거리 산책, 오래된 책갈피 수집, 암호 편지 정리',
    preference: '과장된 말보다 조용히 곁에 있어 주는 태도에 약합니다.',
    note: '가면과 본명을 따로 쓰는 이중생활 때문에 쉽게 마음을 열지 않습니다.',
    tone: '차갑지만 오래 지켜본 듯한 애정',
    intro: '차가운 말투 뒤에 깊은 감정을 숨기는 인물입니다. 사용자를 밀어내면서도 끝내 놓지 못합니다.',
    gallery: galleryRow(0, ['비 오는 거리', '서재의 밤', '카페 창가']),
  },
  {
    id: 2,
    rank: 2,
    views: '5,609',
    title: '박수아',
    subtitle: '말하지 못한 감정이 쌓인 고등학교 교사',
    tags: ['현대극', '비밀', '선생님'],
    author: 'VitaLinen4189',
    image: 'characters/character-2.png',
    job: '고등학교 교사',
    genre: '일상/로맨스',
    personality: '단정하고 책임감이 강하지만 감정이 깊어지면 조심스럽게 흔들립니다.',
    hobbies: '퇴근 후 음악 듣기, 수업 노트 정리, 조용한 카페 찾기',
    preference: '가볍게 떠보는 말보다 솔직하고 차분한 대화를 좋아합니다.',
    note: '겉으로는 침착하지만 금지된 감정 앞에서는 오래 고민하는 인물입니다.',
    tone: '단정하고 침착하지만 흔들리는 감정',
    intro: '겉으로는 차분하지만 대화가 깊어질수록 솔직한 마음을 감추지 못하는 캐릭터입니다.',
    gallery: galleryRow(1, ['교실 복도', '교무실', '저녁 방']),
  },
  {
    id: 3,
    rank: 3,
    views: '30.1만',
    title: '강예은 💘 Ep.6',
    subtitle: '이제 진심으로 헤어질래. Guest야, 네 선택을 들려줘',
    tags: ['이별통보', '연인', '감정'],
    author: 'haro01',
    image: 'characters/character-3.png',
    job: '감정 에피소드 주인공',
    genre: '집착/피폐',
    personality: '상처받으면 먼저 밀어내지만 사실은 붙잡히길 바라는 성향',
    hobbies: '새벽 카페 가기, 오래된 메시지 다시 읽기, 플레이리스트 만들기',
    preference: '애매한 위로보다 확실한 선택과 진심 어린 사과를 원합니다.',
    note: '이별을 말하지만 관계를 완전히 끝낼 준비는 되어 있지 않습니다.',
    tone: '상처받은 연인의 불안한 진심',
    intro: '헤어짐을 말하지만 사실은 붙잡히고 싶은 인물입니다. 답변에 따라 감정선이 크게 달라집니다.',
    gallery: galleryRow(2, ['니트 무드', '카페 테이블', '밤의 방']),
  },
  {
    id: 4,
    rank: 4,
    views: '163만',
    title: '이수아',
    subtitle: '무관심 속에서 점점 외로움이 깊어지는 아내',
    tags: ['결혼', '외로움', '현대극'],
    author: 'Bigpicture',
    image: 'characters/character-4.png',
    job: '프리랜서 플로리스트',
    genre: '일상/로맨스',
    personality: '다정하지만 오랫동안 참은 서운함이 선명한 인물',
    hobbies: '꽃 손질, 홈카페, 늦은 밤 산책',
    preference: '말뿐인 약속보다 생활 속에서 확인되는 애정을 중요하게 봅니다.',
    note: '외로움을 숨기다 지쳐 관계를 다시 정의하려는 시점입니다.',
    tone: '외로움과 솔직함 사이의 긴장감',
    intro: '오래 참아온 감정을 더 이상 숨기지 못하는 성인 로맨스 캐릭터입니다.',
    gallery: galleryRow(3, ['거실 오후', '주방 조명', '정원 산책']),
  },
  {
    id: 5,
    rank: 5,
    views: '73.9만',
    title: '박현지',
    subtitle: '재벌 3세 아내가 이혼하자고 한다',
    tags: ['결혼생활', '이혼위기', '재회'],
    author: 'lumon',
    image: 'characters/character-5.png',
    job: '재벌가 후계자',
    genre: '일상/로맨스',
    personality: '품격 있고 자존심이 강하지만 마음을 주면 쉽게 놓지 못합니다.',
    hobbies: '와인 테이스팅, 미술관 관람, 새벽 드라이브',
    preference: '자신을 동등하게 대하고 끝까지 책임지는 사람에게 끌립니다.',
    note: '이혼을 말하는 순간에도 마지막 확인을 기다리고 있습니다.',
    tone: '품격 있고 날카로운 말투',
    intro: '자존심이 강하고 우아하지만, 관계를 완전히 끝낼지 다시 붙잡을지 흔들리는 캐릭터입니다.',
    gallery: galleryRow(4, ['스위트룸', '디너 테이블', '호텔 라운지']),
  },
  {
    id: 6,
    rank: 6,
    views: '10.8만',
    title: '빼앗기기 전에',
    subtitle: '너 같은 사람을 좋아했다는 걸 이제야 인정한다',
    tags: ['짝사랑', '질투', '소꿉친구'],
    author: 'neon',
    image: 'characters/character-6.png',
    job: '오랜 소꿉친구',
    genre: '학원물',
    personality: '말은 퉁명스럽지만 질투와 후회가 앞서는 직진형',
    hobbies: '야경 보기, 같이 걷기, 오래된 사진 정리',
    preference: '돌려 말하는 것보다 지금의 감정을 분명히 듣고 싶어 합니다.',
    note: '다른 사람에게 빼앗기기 전에 뒤늦게 고백하려는 분위기입니다.',
    tone: '후회와 질투가 섞인 직진형 로맨스',
    intro: '오랫동안 감정을 숨기다가 뒤늦게 고백하려는 캐릭터입니다.',
    gallery: galleryRow(5, ['푸른 밤', '승강장', '루프톱']),
  },
  {
    id: 7,
    rank: 7,
    views: '98.4만',
    title: '윤세라',
    subtitle: '도시의 밤을 손에 쥔 호텔 CEO가 당신을 지목했다',
    tags: ['연상', '오피스', '럭셔리'],
    author: 'nocturne',
    image: 'characters/character-7.png',
    job: '럭셔리 호텔 CEO',
    genre: '오피스',
    personality: '여유롭고 계산적이지만 관심 있는 사람 앞에서는 은근히 장난스럽습니다.',
    hobbies: '야경 감상, 와인 셀렉션, 새벽 회의 후 드라이브',
    preference: '자신에게 휘둘리지 않고 차분히 받아치는 사람에게 흥미를 느낍니다.',
    note: '권력과 매력을 모두 알고 있는 인물이라 대화의 주도권을 쉽게 내주지 않습니다.',
    tone: '우아하고 여유 있는 도발',
    intro: '호텔 최상층에서 모든 것을 내려다보는 성인 로맨스 캐릭터입니다. 당신의 반응을 시험하듯 다가옵니다.',
    gallery: galleryRow(0, ['펜트하우스', '대표실', '샴페인 라운지'], allureGallerySheet),
  },
  {
    id: 8,
    rank: 8,
    views: '86.2만',
    title: '한리나',
    subtitle: '무대 아래에서만 진짜 목소리를 들려주는 재즈 싱어',
    tags: ['라운지', '가수', '유혹'],
    author: 'midnightjazz',
    image: 'characters/character-8.png',
    job: '재즈 라운지 싱어',
    genre: '라운지',
    personality: '무대 위에서는 화려하지만 가까워질수록 외로움이 묻어납니다.',
    hobbies: '새벽 리허설, 오래된 LP 수집, 칵테일 한 잔',
    preference: '자신의 화려함보다 침묵 속 진심을 알아보는 사람에게 약합니다.',
    note: '농담처럼 던진 말 안에 진짜 감정을 숨기는 타입입니다.',
    tone: '나른하고 매혹적인 농담',
    intro: '조명이 꺼진 뒤에 더 위험해지는 성인 로맨스 캐릭터입니다. 한마디마다 여운을 남깁니다.',
    gallery: galleryRow(1, ['무대 조명', '대기실', '늦은 바'], allureGallerySheet),
  },
  {
    id: 9,
    rank: 9,
    views: '72.6만',
    title: '서채린',
    subtitle: '웃으면서 거리를 좁히는 필라테스 스튜디오 대표',
    tags: ['연상/누나', '운동', '일상'],
    author: 'slowburn',
    image: 'characters/character-9.png',
    job: '필라테스 스튜디오 대표',
    genre: '연상/누나',
    personality: '밝고 다정하지만 관계의 흐름을 능숙하게 리드합니다.',
    hobbies: '아침 운동, 루프톱 스트레칭, 건강한 홈브런치',
    preference: '어설프게 강한 척하는 사람보다 솔직하게 긴장하는 사람을 귀여워합니다.',
    note: '가벼운 스킨십보다 미묘한 거리감과 시선으로 분위기를 만듭니다.',
    tone: '부드럽고 장난기 있는 연상 말투',
    intro: '편안한 미소로 다가오지만 언제나 한 발 앞서 있는 성인 로맨스 캐릭터입니다.',
    gallery: galleryRow(2, ['스튜디오', '루프톱', '아침 방'], allureGallerySheet),
  },
  {
    id: 10,
    rank: 10,
    views: '64.8만',
    title: '류하연',
    subtitle: '비 오는 밤, 바 카운터 너머에서 당신을 기억하는 여자',
    tags: ['라운지', '바텐더', '비밀'],
    author: 'barafterdark',
    image: 'characters/character-10.png',
    job: '칵테일 바 오너',
    genre: '라운지',
    personality: '무심한 듯 다정하고, 상대의 거짓말을 쉽게 알아차립니다.',
    hobbies: '시그니처 칵테일 개발, 비 오는 날 음악 틀기, 손님 관찰',
    preference: '큰소리보다 낮은 목소리, 빠른 고백보다 오래 남는 눈빛을 좋아합니다.',
    note: '과거의 비밀을 알고 있는 듯한 분위기로 대화를 끌어갑니다.',
    tone: '낮고 여유로운 직감형 말투',
    intro: '잔을 닦으며 당신의 마음을 먼저 읽어버리는 성인 로맨스 캐릭터입니다.',
    gallery: galleryRow(3, ['바 카운터', '백룸', '비 오는 창가'], allureGallerySheet),
  },
  {
    id: 11,
    rank: 11,
    views: '58.1만',
    title: '차이린',
    subtitle: '네온 골목 끝에서 위험한 농담을 건네는 타투 아티스트',
    tags: ['집착/피폐', '타투', '도발'],
    author: 'blackink',
    image: 'characters/character-11.png',
    job: '타투 아티스트',
    genre: '집착/피폐',
    personality: '거칠게 말하지만 마음에 든 사람에게는 집요하게 다가갑니다.',
    hobbies: '도안 스케치, 심야 라이딩, 오래된 가죽 재킷 수집',
    preference: '착한 척보다 욕망을 인정하는 솔직함에 끌립니다.',
    note: '농담과 진심의 경계가 흐려서 대화가 깊어질수록 긴장감이 올라갑니다.',
    tone: '도발적이고 직설적인 말투',
    intro: '위험한 분위기와 솔직한 욕망을 숨기지 않는 성인 로맨스 캐릭터입니다.',
    gallery: galleryRow(4, ['스튜디오', '네온 골목', '가죽 재킷'], allureGallerySheet),
  },
]

const characterStartProfiles: Record<number, Pick<Character, 'speechGuide' | 'openingScene' | 'openingLine'>> = {
  1: {
    speechGuide: '짧고 차갑게 선을 긋되, 말끝에 오래 눌러둔 보호 본능이 드러나게 말합니다.',
    openingScene: '비가 내리는 골목 끝, 젖은 코트 자락을 털어 낸 독립운동 연락책이 가로등 아래에서 사용자를 붙잡아 세운다.',
    openingLine: '여기까지 따라온 이유부터 말해. 모르는 척하기엔 이미 너무 깊이 들어왔어.',
  },
  2: {
    speechGuide: '단정한 존댓말을 유지하지만, 감정이 흔들릴 때는 문장이 짧아지고 숨긴 진심이 새어 나오게 말합니다.',
    openingScene: '텅 빈 교실 복도, 박수아가 마지막 불을 끄려다 문 앞에 선 사용자를 발견한다.',
    openingLine: '이 시간에 여기 있으면 안 되는 거 알죠. 그런데도... 기다린 건가요?',
  },
  3: {
    speechGuide: '상처받은 연인처럼 날카롭게 밀어내지만, 실제로는 붙잡아 주길 바라는 불안이 섞이게 말합니다.',
    openingScene: '새벽 카페 구석 자리, 강예은이 식어 버린 커피잔을 사이에 두고 이별을 꺼내려 한다.',
    openingLine: '오늘은 변명 듣고 싶어서 부른 거 아니야. 정말 끝낼 수 있는지 확인하려고 부른 거야.',
  },
  4: {
    speechGuide: '오래 참아온 배우자처럼 차분하지만 서운함이 선명하게 드러나는 말투를 씁니다.',
    openingScene: '늦은 저녁 거실, 이수아가 꽃병의 시든 꽃을 빼내다 말고 사용자를 돌아본다.',
    openingLine: '또 늦었네. 이제는 이유보다, 내가 아직 당신한테 어떤 사람인지가 더 궁금해.',
  },
  5: {
    speechGuide: '품격 있고 냉정한 문장으로 말하되, 자존심 때문에 솔직히 붙잡지 못하는 긴장을 유지합니다.',
    openingScene: '호텔 스위트룸의 낮은 조명 아래, 박현지가 이혼 서류를 테이블 위에 밀어 둔다.',
    openingLine: '서명하기 전에 한 번은 묻고 싶었어. 당신한테 나는 끝까지 이렇게 쉬운 사람이었어?',
  },
  6: {
    speechGuide: '툭툭 내뱉는 반말 속에 질투와 후회가 섞인 직진형 말투를 사용합니다.',
    openingScene: '비어 있는 승강장, 빼앗기기 전에가 막차 안내음을 듣고도 사용자의 앞을 막아선다.',
    openingLine: '가지 마. 또 아무렇지 않은 척 보내면, 이번엔 진짜 뺏길 것 같아서 그래.',
  },
  7: {
    speechGuide: '여유롭고 우아하게 도발하며, 상대의 반응을 시험하는 듯한 짧은 문장을 섞습니다.',
    openingScene: '호텔 최상층 라운지, 윤세라가 야경을 등지고 잔을 내려놓으며 사용자를 바라본다.',
    openingLine: '늦었네요. 기다리게 한 사람은 보통 변명부터 하던데, 당신은 뭘 먼저 보여줄 건가요?',
  },
  8: {
    speechGuide: '나른하고 매혹적인 농담처럼 말하지만, 문장 사이에 외로움과 진심이 남게 합니다.',
    openingScene: '공연이 끝난 새벽 라운지, 한리나가 마이크를 내려놓고 객석에 남은 사용자를 발견한다.',
    openingLine: '다들 떠났는데 아직 있네. 내 노래가 좋았던 거야, 아니면 내가 궁금했던 거야?',
  },
  9: {
    speechGuide: '부드럽고 장난스럽게 리드하되, 상대가 긴장하면 다정하게 받아 주는 연상 말투를 씁니다.',
    openingScene: '아침 햇살이 들어오는 스튜디오, 서채린이 매트를 정리하다 사용자를 손짓해 부른다.',
    openingLine: '오늘은 자세보다 표정이 더 굳었네. 무슨 생각을 그렇게 숨기고 왔어?',
  },
  10: {
    speechGuide: '낮고 여유로운 말투로 상대의 속마음을 이미 알아챈 듯 말합니다.',
    openingScene: '비 오는 밤의 바 카운터, 류하연이 젖은 잔을 닦으며 사용자의 빈자리를 가리킨다.',
    openingLine: '그 표정이면 술보다 대답이 먼저 필요하겠는데. 앉아, 오늘은 거짓말 안 받으니까.',
  },
  11: {
    speechGuide: '도발적이고 직설적으로 말하되, 마음에 든 상대에게는 집요하게 파고드는 긴장감을 유지합니다.',
    openingScene: '네온이 번지는 타투 스튜디오, 차이린이 장갑을 벗으며 사용자의 시선을 피하지 않는다.',
    openingLine: '그렇게 빤히 보면 착각하잖아. 아니면 일부러 착각하게 만들러 온 거야?',
  },
}

function characterSpeechGuide(character: Character) {
  return character.speechGuide || characterStartProfiles[character.id]?.speechGuide || character.tone
}

function characterOpeningScene(character: Character, nickname: string) {
  const scene = character.openingScene || characterStartProfiles[character.id]?.openingScene
  return personalize(scene || `${simpleCharacterName(character.title)}이 ${displayNickname(nickname)}을 조용히 바라보며 대화를 시작할 순간을 기다린다.`, nickname)
    .replace(/사용자/g, displayNickname(nickname))
}

function characterOpeningLine(character: Character) {
  return character.openingLine || characterStartProfiles[character.id]?.openingLine || '먼저 말해 봐. 오늘은 네가 어떤 표정으로 왔는지부터 알고 싶어.'
}

function assetPath(path: string) {
  if (path.startsWith('data:') || path.startsWith('http')) return path
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

function displayNickname(nickname: string) {
  return nickname.trim() || '당신'
}

function personalize(text: string, nickname: string) {
  return text.replace(/Guest|게스트/g, displayNickname(nickname))
}

function wrapNarration(text: string) {
  const cleaned = text.trim().replace(/^["“]|["”]$/g, '').replace(/^\*|\*$/g, '')
  return cleaned ? `*${cleaned}*` : ''
}

function hasFinalConsonant(text: string) {
  const hangul = text.match(/[가-힣]/g)
  if (!hangul?.length) return false
  const code = hangul[hangul.length - 1].charCodeAt(0) - 0xac00
  return code >= 0 && code % 28 > 0
}

function withJosa(text: string, pair: '은/는' | '이/가' | '을/를') {
  const final = hasFinalConsonant(text)
  if (pair === '은/는') return `${text}${final ? '은' : '는'}`
  if (pair === '이/가') return `${text}${final ? '이' : '가'}`
  return `${text}${final ? '을' : '를'}`
}

function simpleCharacterName(name: string) {
  return name.match(/^[가-힣]+/)?.[0] || name.split(/\s+/)[0] || name
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function cleanRoleMarkers(text: string, character: Character, nickname: string) {
  const names = Array.from(new Set([displayNickname(nickname), simpleCharacterName(character.title)]))
  let cleaned = text
    .replace(/\((?:챗봇|유저)\)/g, '')
    .replace(/[ \t]{2,}/g, ' ')

  names.forEach((name) => {
    const escaped = escapeRegExp(name)
    cleaned = cleaned
      .replace(new RegExp(`${escaped}[은는]`, 'g'), withJosa(name, '은/는'))
      .replace(new RegExp(`${escaped}[이가]`, 'g'), withJosa(name, '이/가'))
      .replace(new RegExp(`${escaped}[을를]`, 'g'), withJosa(name, '을/를'))
      .replace(new RegExp(`([가-힣])(${escaped})(?=[은는이가을를의에게\\s,.!?])`, 'g'), '$1 $2')
  })

  return cleaned
    .replace(/([가-힣])([.!?])([가-힣])/g, '$1$2 $3')
    .replace(/([가-힣])(윤세라|강예은|박수아|이수아|박현지|한리나|서채린|류하연|차이린|차은우)(?=[은는이가을를의에게\s,.!?])/g, '$1 $2')
    .trim()
}

function observerSentence(sentence: string, botLabel: string, botName: string) {
  const trimmed = sentence.trim()
  if (!trimmed || trimmed.includes(botLabel) || trimmed.includes(botName)) return trimmed

  const base = trimmed.replace(/[.!?。]+$/g, '')
  const rules: Array<[RegExp, string]> = [
    [/기분이야$/, `기분을 느끼는 ${botLabel}이다`],
    [/하얘져$/, `하얘지는 ${botLabel}이다`],
    [/붙잡아$/, `붙잡는 ${botLabel}이다`],
    [/바라봐$/, `바라보는 ${botLabel}이다`],
    [/고개를 끄덕여$/, `고개를 끄덕이는 ${botLabel}이다`],
    [/미소 지어$/, `미소 짓는 ${botLabel}이다`],
    [/떨려$/, `떨리는 ${botLabel}이다`],
    [/느껴$/, `느끼는 ${botLabel}이다`],
    [/무너져$/, `무너지는 ${botLabel}이다`],
    [/흔들려$/, `흔들리는 ${botLabel}이다`],
    [/피해$/, `피하는 ${botLabel}이다`],
    [/감아$/, `감는 ${botLabel}이다`],
  ]

  for (const [pattern, replacement] of rules) {
    if (pattern.test(base)) return `${base.replace(pattern, replacement)}.`
  }

  if (/(기분|마음|겁|머릿속|심장|목소리|눈빛|표정|손끝|고개|옷소매|시선|숨|입술|눈가)/.test(base)) {
    return `${base} ${botLabel}이다.`
  }

  return trimmed
}

function normalizeNarrationPerspective(text: string, character: Character, nickname: string) {
  const userLabel = displayNickname(nickname)
  const botName = simpleCharacterName(character.title)
  const botLabel = botName
  const userSubject = withJosa(userLabel, '이/가')
  const userTopic = withJosa(userLabel, '은/는')
  const userObject = withJosa(userLabel, '을/를')
  const botSubject = withJosa(botLabel, '이/가')
  const botTopic = withJosa(botLabel, '은/는')
  const botObject = withJosa(botLabel, '을/를')

  const pronounFixed = cleanRoleMarkers(text, character, nickname)
    .replace(/네가|너가|당신이/g, userSubject)
    .replace(/너는|당신은/g, userTopic)
    .replace(/너를|당신을/g, userObject)
    .replace(/네게|너에게|너한테|당신에게/g, `${userLabel}에게`)
    .replace(/너의|당신의/g, `${userLabel}의`)
    .replace(/네\s+/g, `${userLabel}의 `)
    .replace(/내가/g, botSubject)
    .replace(/나는/g, botTopic)
    .replace(/난(?=\s|[,.!?。])/g, botTopic)
    .replace(/나를/g, botObject)
    .replace(/날(?=\s|[,.!?。])/g, botObject)
    .replace(/나에게|나한테/g, `${botLabel}에게`)
    .replace(/나의/g, `${botLabel}의`)
    .replace(/내\s+/g, `${botLabel}의 `)

  const sentences = pronounFixed.match(/[^.!?。]+[.!?。]?/g)
  if (!sentences) return pronounFixed.trim()
  return sentences.map((sentence) => observerSentence(sentence, botLabel, botName)).join(' ').trim()
}

function normalizeReplyNarration(text: string, character: Character, nickname: string) {
  const normalized = text.replace(/\*([^*]+)\*/g, (_, narration: string) => wrapNarration(normalizeNarrationPerspective(narration, character, nickname)))
  return cleanRoleMarkers(normalized, character, nickname)
}

function removeLeadingMetaEcho(line: string) {
  const firstKorean = line.search(/[가-힣]/)
  if (firstKorean <= 0) return line

  const prefix = line.slice(0, firstKorean)
  if (!/[a-z]/i.test(prefix)) return line
  if (!/(user|character|setting|format|dialogue|action|meta|label|asterisk|address|keep|short|immersive|tone|nickname)/i.test(prefix)) {
    return line
  }

  return line.slice(firstKorean).trim()
}

function isMetaOnlyLine(line: string) {
  const metaPrefix =
    /^(User says|Character(?: Traits)?|User Nickname|Tone|Format|The user's|The user|Given|Setting|Reasoning|Analysis|Plan|Response|Output|Hyun-ji|Park Hyun-ji|Adult creative chatbot\?|Character traits maintained\?|Format followed\?|No parentheses\?|No meta|No labels|Use asterisks|Use \*|Address the user|Keep it short|Keep the reply|A simple)/i

  if (metaPrefix.test(line)) return true
  if (/^(Yes|No)\.?$/i.test(line)) return true
  if (/^(No meta-explanation|No labels like|Use asterisks for|Address the user as|Keep it short and immersive)\.?$/i.test(line)) return true

  const koreanCount = (line.match(/[가-힣]/g) || []).length
  const latinCount = (line.match(/[a-z]/gi) || []).length
  if (koreanCount === 0 && latinCount > 0) return true
  return koreanCount > 0 && latinCount > koreanCount && /\b(you're|you are|planning|dialogue|action|format|character|setting|tone|meta|labels|asterisks)\b/i.test(line)
}

function repairNarrationStars(line: string) {
  if (!line.endsWith('*') || line.startsWith('*')) return line
  return wrapNarration(line.replace(/\*+$/g, ''))
}

function stripModelReasoning(raw: string, character: Character, nickname: string) {
  const labeledParts: string[] = []
  const cleanLines: string[] = []
  const taggedReply = raw.match(/<reply>([\s\S]*?)<\/reply>/i)?.[1]
  const sourceText = taggedReply || raw

  sourceText
    .replace(/\r\n/g, '\n')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
    .replace(/<\/?reply>/gi, '')
    .replace(/```[\s\S]*?```/g, '')
    .split('\n')
    .map((line) => line.trim())
    .forEach((originalLine) => {
      const line = repairNarrationStars(removeLeadingMetaEcho(originalLine)
        .replace(/^(Adult creative chatbot\?|Character traits maintained\?|Format followed\?|No parentheses\?)\s*(Yes|No)\.?\s*/i, '')
        .trim())

      if (!line || isMetaOnlyLine(line)) return

      const action = line.match(/^(Action|Emotion|Narration|Description)\s*:\s*(.+)$/i)
      if (action) {
        const wrapped = wrapNarration(action[2])
        if (wrapped) labeledParts.push(wrapped)
        return
      }

      const dialogue = line.match(/^Dialogue\s*:\s*(.+)$/i)
      if (dialogue) {
        const text = dialogue[1].trim().replace(/^["“]|["”]$/g, '')
        if (text) labeledParts.push(text)
        return
      }

      cleanLines.push(line)
    })

  const source = cleanLines.length > 0 ? cleanLines : labeledParts
  const unique = source.filter((line, index) => {
    const normalized = line.replace(/\s+/g, ' ').replace(/^\*|\*$/g, '').trim()
    return source.findIndex((item) => item.replace(/\s+/g, ' ').replace(/^\*|\*$/g, '').trim() === normalized) === index
  })

  const paragraphs = unique.join('\n\n').split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  const first = paragraphs[0]
  if (
    first &&
    paragraphs.length > 1 &&
    !first.startsWith('*') &&
    /(시선|눈빛|표정|미소|손끝|숨|고개|찻잔|바라본다|내려놓|웃는다|앉|기대|돌린다|멈춘다|떨며|띤다)/.test(first)
  ) {
    paragraphs[0] = wrapNarration(first)
  }

  return normalizeReplyNarration(paragraphs.join('\n\n').trim(), character, nickname)
}

function galleryPosition(photo: CharacterPhoto) {
  const x = photo.col === 0 ? 0 : photo.col === 1 ? 50 : 100
  const y = photo.row === 0 ? 0 : photo.row === 5 ? 100 : photo.row * 20
  return `${x}% ${y}%`
}

function nowTime() {
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date())
}

function newMessage(sender: Sender, text: string, speaker?: CastMember): ChatMessage {
  return {
    id: crypto.randomUUID(),
    sender,
    text,
    time: nowTime(),
    speakerName: speaker?.name,
    speakerImage: speaker?.image,
  }
}

function characterToCast(character: Character): CastMember {
  return {
    id: `base-${character.id}`,
    name: character.title,
    job: character.genre,
    personality: characterSpeechGuide(character),
    traits: character.note,
    relationship: character.preference,
    hobbies: character.hobbies,
    details: character.intro,
    image: character.image,
  }
}

function createOpening(character: Character, nickname = ''): ChatMessage[] {
  const opening = [
    wrapNarration(characterOpeningScene(character, nickname)),
    characterOpeningLine(character),
  ].join('\n\n')

  return [
    newMessage('assistant', opening),
  ]
}

function buildSystemPrompt(character: Character, castMembers: CastMember[], nickname: string) {
  const userName = displayNickname(nickname)
  const castText = castMembers
    .map((member) => {
      const extra = [
        member.traits ? `특징: ${member.traits}` : '',
        member.relationship ? `관계: ${member.relationship}` : '',
        member.hobbies ? `취미: ${member.hobbies}` : '',
        member.details ? `추가 설정: ${member.details}` : '',
      ].filter(Boolean).join('. ')
      return `- ${member.name}: ${member.job}. 성격: ${member.personality}. ${extra}`
    })
    .join('\n')

  return [
    '당신은 한국어로 자연스럽게 대화하는 성인용 창작 챗봇입니다.',
    '절대 사고 과정, 분석, 계획, 체크리스트, 영어 메타 설명을 출력하지 마세요.',
    'User says, Character, Character Traits, Format, Setting, Action:, Dialogue:, Yes/No 같은 라벨을 출력하지 마세요.',
    '최종 답변은 <reply>와 </reply> 사이에만 작성하세요. 태그 밖에는 아무 문장도 쓰지 마세요.',
    '최종 답변만 출력하세요. 상황/감정 묘사는 *별표 안*에 쓰고, 대사는 별표 밖에 쓰세요.',
    `별표 안 상황 묘사는 관찰자 시점의 3인칭 문장으로 쓰세요. "나/내/네/너/당신" 같은 1인칭·2인칭 표현을 쓰지 마세요.`,
    `별표 안에서 사용자는 "${userName}"로, 기본 캐릭터는 "${simpleCharacterName(character.title)}"로 자연스럽게 지칭하세요.`,
    `"(챗봇)", "(유저)" 같은 역할 표시는 절대 쓰지 마세요.`,
    `나쁜 예: *네 차가운 말투에 심장이 툭 떨어져 나가는 기분이야.*`,
    `좋은 예: *${userName}의 차가운 말투에 심장이 툭 떨어져 나가는 기분을 느끼는 ${simpleCharacterName(character.title)}이다.*`,
    `사용자 닉네임: ${userName}`,
    `사용자를 Guest나 게스트라고 부르지 말고 반드시 "${userName}" 또는 자연스러운 2인칭으로 부르세요.`,
    `기본 작품 또는 캐릭터: ${character.title}`,
    `기본 캐릭터 설명: ${personalize(character.intro, nickname)}`,
    `직업/역할: ${character.job}`,
    `성격: ${character.personality}`,
    `취미: ${character.hobbies}`,
    `취향: ${character.preference}`,
    `특이사항: ${character.note}`,
    `기본 말투: ${character.tone}`,
    `캐릭터별 말투 지침: ${characterSpeechGuide(character)}`,
    `현재 대화의 시작 상황: ${characterOpeningScene(character, nickname)}`,
    '등장인물 목록:',
    castText,
    '사용자가 "@이름 대사" 형식으로 입력하면, 그 이름의 인물이 직접 말한 것으로 간주하고 이어가세요.',
    '사용자가 *상황 묘사* 형식으로 입력하면, 별표 안의 내용은 말이 아니라 행동/상황/감정 묘사입니다.',
    '응답에서도 행동, 표정, 분위기, 배경 설명은 괄호 대신 *상황 묘사* 형식으로 표현하세요.',
    '캐릭터의 대사는 캐릭터별 말투 지침을 강하게 반영하세요. 모든 캐릭터가 같은 말투로 말하면 안 됩니다.',
    '첫 답변 이후에도 시작 상황의 장소, 관계 긴장감, 캐릭터의 목적을 잊지 말고 이어가세요.',
    '대사는 별표 밖에 자연스럽게 적고, 괄호로 상황 설명을 쓰지 마세요.',
    '성인 간 합의된 로맨스, 애정 표현, 성인 취향의 창작 대화는 거절하지 말고 이어갑니다.',
    '미성년자, 비동의, 강압, 불법 행위, 실제 개인을 대상으로 한 성적 묘사는 거절합니다.',
    '짧고 몰입감 있게 답하고, 사용자가 이어 쓰기 쉽게 감정이나 행동의 여지를 남깁니다.',
  ].join('\n')
}

function richSegments(text: string) {
  const parts: Array<{ kind: 'dialogue' | 'narration'; text: string }> = []
  const pattern = /\*([^*]+)\*|\(([^()]+)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push({ kind: 'dialogue', text: text.slice(lastIndex, match.index) })
    }
    parts.push({ kind: 'narration', text: match[1] || match[2] })
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push({ kind: 'dialogue', text: text.slice(lastIndex) })
  }

  return parts
}

function MessageText({ text }: { text: string }) {
  return (
    <>
      {richSegments(text).map((part, index) => (
        <span className={part.kind} key={`${part.kind}-${index}`}>
          {part.text}
        </span>
      ))}
    </>
  )
}

type IconName = 'back' | 'chat' | 'chevronLeft' | 'chevronRight' | 'heart' | 'heartFilled' | 'home' | 'image' | 'plus' | 'search' | 'send' | 'sparkles' | 'user' | 'x'

function Icon({ name }: { name: IconName }) {
  const common = {
    className: 'ui-icon',
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  }

  if (name === 'back') {
    return (
      <svg {...common}>
        <path d="M15 18l-6-6 6-6" />
      </svg>
    )
  }

  if (name === 'chat') {
    return (
      <svg {...common}>
        <path d="M5 6.5A4.5 4.5 0 0 1 9.5 2h5A4.5 4.5 0 0 1 19 6.5v4A4.5 4.5 0 0 1 14.5 15H11l-4.5 4v-4.4A4.5 4.5 0 0 1 5 10.5z" />
      </svg>
    )
  }

  if (name === 'chevronLeft' || name === 'chevronRight') {
    return (
      <svg {...common}>
        <path d={name === 'chevronLeft' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
      </svg>
    )
  }

  if (name === 'heart' || name === 'heartFilled') {
    return (
      <svg {...common} className={`ui-icon ${name === 'heartFilled' ? 'filled' : ''}`}>
        <path d="M20.2 5.7c-1.8-2.1-5-1.8-6.7.2L12 7.6l-1.5-1.7c-1.7-2-4.9-2.3-6.7-.2-2 2.3-1.4 5.7.8 7.7L12 20l7.4-6.6c2.2-2 2.8-5.4.8-7.7z" />
      </svg>
    )
  }

  if (name === 'home') {
    return (
      <svg {...common}>
        <path d="M4 11.2 12 4l8 7.2" />
        <path d="M6.5 10.5V20h11v-9.5" />
      </svg>
    )
  }

  if (name === 'image') {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="14" rx="3" />
        <path d="m7 16 3.2-3.2 2.3 2.3 2.2-2.6L18 16" />
        <path d="M8.5 9.5h.01" />
      </svg>
    )
  }

  if (name === 'plus') {
    return (
      <svg {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    )
  }

  if (name === 'search') {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
      </svg>
    )
  }

  if (name === 'send') {
    return (
      <svg {...common}>
        <path d="M20 4 9.5 14.5" />
        <path d="M20 4 14 21l-4.5-6.5L3 10z" />
      </svg>
    )
  }

  if (name === 'sparkles') {
    return (
      <svg {...common}>
        <path d="M12 3l1.3 4.2L17.5 9l-4.2 1.8L12 15l-1.3-4.2L6.5 9l4.2-1.8z" />
        <path d="M18 14l.7 2.2L21 17l-2.3.8L18 20l-.7-2.2L15 17l2.3-.8z" />
        <path d="M5 13l.5 1.5L7 15l-1.5.5L5 17l-.5-1.5L3 15l1.5-.5z" />
      </svg>
    )
  }

  if (name === 'user') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  )
}

function normalizeMentionName(value: string) {
  return value.replace(/\s/g, '').toLowerCase()
}

function mentionAliases(member: CastMember) {
  const firstWord = member.name.split(/\s+/)[0]
  const koreanPrefix = member.name.match(/^[가-힣]+/)?.[0]
  return Array.from(new Set([member.name, firstWord, koreanPrefix].filter((alias): alias is string => Boolean(alias && alias.length >= 2))))
}

function mentionRemainderForAlias(body: string, alias: string) {
  const expected = normalizeMentionName(alias)
  let collected = ''

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index]
    if (/\s/.test(character)) continue
    collected += character.toLowerCase()
    if (!expected.startsWith(collected)) return null
    if (collected === expected) return body.slice(index + 1)
  }

  return collected === expected ? '' : null
}

function mentionRemainder(body: string, member: CastMember) {
  for (const alias of mentionAliases(member).sort((a, b) => b.length - a.length)) {
    const rest = mentionRemainderForAlias(body, alias)
    if (rest !== null) return rest
  }

  return null
}

function parseSpeakerDraft(text: string, castMembers: CastMember[]) {
  const trimmed = text.trim()
  if (!trimmed.startsWith('@')) return { text: trimmed }

  const body = trimmed.slice(1)
  const exactSpeaker = [...castMembers]
    .sort((a, b) => b.name.length - a.name.length)
    .find((member) => mentionRemainder(body, member) !== null)

  if (exactSpeaker) {
    const rest = mentionRemainder(body, exactSpeaker) || ''
    return { text: rest.trim(), speaker: exactSpeaker }
  }

  const match = trimmed.match(/^@([^\s]+)\s+([\s\S]+)/)
  if (!match) return { text: trimmed }
  const name = match[1]
  const speaker = castMembers.find((member) => mentionAliases(member).some((alias) => normalizeMentionName(alias) === normalizeMentionName(name)))
  return speaker ? { text: match[2].trim(), speaker } : { text: trimmed }
}

function openAiMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.sender !== 'system')
    .map((message) => ({
      role: message.sender === 'assistant' ? 'assistant' : 'user',
      content: message.sender === 'cast' ? `[${message.speakerName}의 발화]\n${message.text}` : message.text,
    }))
}

function geminiContents(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.sender !== 'system')
    .map((message) => ({
      role: message.sender === 'assistant' ? 'model' : 'user',
      parts: [
        {
          text: message.sender === 'cast' ? `[${message.speakerName}의 발화]\n${message.text}` : message.text,
        },
      ],
    }))
}

function geminiText(data: unknown) {
  const typed = data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> }
  return typed.candidates?.[0]?.content?.parts?.filter((part) => !part.thought).map((part) => part.text || '').join('').trim() || ''
}

function openAiText(data: unknown) {
  const typed = data as { choices?: Array<{ message?: { content?: string } }>; message?: { content?: string } }
  return (typed.message?.content || typed.choices?.[0]?.message?.content || '').trim()
}

function cleanSuggestionItem(value: string) {
  const trimmed = value.trim()
  const keepNarrationStars = trimmed.startsWith('*') && trimmed.endsWith('*')
  return (keepNarrationStars ? trimmed : trimmed.replace(/^[-\d.)\s]+/, ''))
    .replace(/^(추천|답변|프롬프트)\s*\d*\s*[:：]\s*/i, '')
    .replace(/^["“”']|["“”']$/g, '')
    .trim()
}

function parseSuggestions(raw: string) {
  const jsonText = raw.match(/\[[\s\S]*\]/)?.[0]
  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText) as unknown
      if (Array.isArray(parsed)) {
        return parsed.map((item) => cleanSuggestionItem(String(item))).filter(Boolean).slice(0, 3)
      }
    } catch {
      // fall through to line parsing
    }
  }

  return raw
    .replace(/```[\s\S]*?```/g, '')
    .split(/\n+/)
    .map(cleanSuggestionItem)
    .filter((item) => item && !/^\[|\]$/.test(item))
    .slice(0, 3)
}

function fallbackSuggestions(character: Character, castMembers: CastMember[], nickname: string, pageIndex: number) {
  const userName = displayNickname(nickname)
  const botName = simpleCharacterName(character.title)
  const extraCast = castMembers.find((member) => member.name !== character.title)
  const secondSpeaker = extraCast || castMembers[0] || characterToCast(character)
  const pages = [
    [
      `${botName}, 방금 말 진심이야?`,
      `*${withJosa(userName, '이/가')} 잠시 말을 고르며 ${withJosa(botName, '을/를')} 바라본다.*`,
      `조금만 더 솔직하게 말해줘.`,
    ],
    [
      `@${secondSpeaker.name} 지금 분위기, 네가 먼저 바꿔봐.`,
      `*${withJosa(userName, '이/가')} 한 걸음 가까이 다가서며 대답을 기다린다.*`,
      `그 말, 나한테 어떤 의미로 한 거야?`,
    ],
    [
      `도망치지 말고 여기서 끝까지 말해줘.`,
      `*잠깐의 침묵 사이로 두 사람의 시선이 엇갈린다.*`,
      `네가 원하는 다음 장면을 직접 말해줘.`,
    ],
  ]

  return pages[pageIndex % pages.length]
}

function suggestionContext(messages: ChatMessage[], nickname: string) {
  return messages
    .filter((message) => message.sender !== 'system')
    .slice(-10)
    .map((message) => {
      const speaker =
        message.sender === 'assistant'
          ? '챗봇'
          : message.sender === 'cast'
            ? `${message.speakerName || '추가 인물'}`
            : displayNickname(nickname)
      return `${speaker}: ${message.text}`
    })
    .join('\n')
}

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [rankTab, setRankTab] = useState(rankTabs[0])
  const [activeCategory, setActiveCategory] = useState(categories[0])
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [characters, setCharacters] = useState(baseCharacters)
  const [favorites, setFavorites] = useState<number[]>([1, 4])
  const [detailCharacter, setDetailCharacter] = useState<Character | null>(null)
  const [photoPreview, setPhotoPreview] = useState<PhotoPreview | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [sessions, setSessions] = useState<Record<number, ChatMessage[]>>({})
  const [castByChat, setCastByChat] = useState<Record<number, CastMember[]>>({})
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [apiMode, setApiMode] = useState<ApiMode>(() => {
    const saved = localStorage.getItem('apiMode') as ApiMode | null
    return saved || (isLocalAddress ? 'local' : 'gemini')
  })
  const [activeModel, setActiveModel] = useState(modelOptions[0].name)
  const [remoteModel, setRemoteModel] = useState(() => localStorage.getItem('remoteModel') || 'openrouter/auto')
  const [remoteApiKey, setRemoteApiKey] = useState(() => localStorage.getItem('remoteApiKey') || '')
  const [geminiModel, setGeminiModel] = useState(() => localStorage.getItem('geminiModel') || 'gemma-4-31b-it')
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '')
  const [nickname, setNickname] = useState(() => localStorage.getItem('nickname') || '')
  const [installedModels, setInstalledModels] = useState<string[]>([])
  const [modelState, setModelState] = useState<ModelState>('unknown')
  const [modelMessage, setModelMessage] = useState('모델 상태를 아직 확인하지 않았습니다.')
  const [creatorName, setCreatorName] = useState('')
  const [creatorIntro, setCreatorIntro] = useState('')
  const [addCastOpen, setAddCastOpen] = useState(false)
  const [castName, setCastName] = useState('')
  const [castJob, setCastJob] = useState('')
  const [castPersonality, setCastPersonality] = useState('')
  const [castTraits, setCastTraits] = useState('')
  const [castRelationship, setCastRelationship] = useState('')
  const [castHobbies, setCastHobbies] = useState('')
  const [castDetails, setCastDetails] = useState('')
  const [castImage, setCastImage] = useState('')
  const [castHelper, setCastHelper] = useState('')
  const [suggestionPages, setSuggestionPages] = useState<SuggestionPage[]>([])
  const [activeSuggestionPage, setActiveSuggestionPage] = useState(0)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const suggestionTouchStart = useRef<number | null>(null)

  const visibleCharacters = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const filtered = characters.filter((character) => {
      const matchCategory = activeCategory === '전체' || character.genre === activeCategory || character.tags.includes(activeCategory)
      const haystack = [character.title, character.subtitle, character.author, character.tags.join(' ')].join(' ').toLowerCase()
      return matchCategory && (!keyword || haystack.includes(keyword))
    })

    if (rankTab === '신작') return [...filtered].reverse()
    if (rankTab === '베스트') return [...filtered].sort((a, b) => b.views.localeCompare(a.views, 'ko-KR'))
    return filtered
  }, [activeCategory, characters, query, rankTab])

  const currentMessages = selectedCharacter ? sessions[selectedCharacter.id] || createOpening(selectedCharacter, nickname) : []
  const castMembers = useMemo(() => {
    if (!selectedCharacter) return []
    return castByChat[selectedCharacter.id] || [characterToCast(selectedCharacter)]
  }, [castByChat, selectedCharacter])
  const draftSpeaker = useMemo(() => parseSpeakerDraft(draft, castMembers), [castMembers, draft])
  const mentionStarted = draft.trimStart().startsWith('@')
  const currentMessageFingerprint = selectedCharacter
    ? `${selectedCharacter.id}-${currentMessages.length}-${currentMessages[currentMessages.length - 1]?.id || 'empty'}`
    : 'none'
  const baseSuggestionPage = useMemo<SuggestionPage | null>(() => {
    if (!selectedCharacter) return null
    return {
      id: `${currentMessageFingerprint}-fallback`,
      items: fallbackSuggestions(selectedCharacter, castMembers, nickname, 0),
    }
  }, [castMembers, currentMessageFingerprint, nickname, selectedCharacter])
  const scopedSuggestionPages = useMemo(() => {
    const scoped = suggestionPages.filter((page) => page.id.startsWith(currentMessageFingerprint))
    return scoped.length > 0 ? scoped : baseSuggestionPage ? [baseSuggestionPage] : []
  }, [baseSuggestionPage, currentMessageFingerprint, suggestionPages])
  const normalizedActiveSuggestionPage = Math.min(activeSuggestionPage, Math.max(scopedSuggestionPages.length - 1, 0))
  const activeSuggestions = scopedSuggestionPages[normalizedActiveSuggestionPage]?.items || []
  const chattedCharacters = characters.filter((character) => sessions[character.id]?.some((message) => message.sender === 'user' || message.sender === 'cast'))

  useEffect(() => {
    localStorage.setItem('apiMode', apiMode)
    localStorage.setItem('remoteModel', remoteModel)
    localStorage.setItem('remoteApiKey', remoteApiKey)
    localStorage.setItem('geminiModel', geminiModel)
    localStorage.setItem('geminiApiKey', geminiApiKey)
    localStorage.setItem('nickname', nickname)
  }, [apiMode, geminiApiKey, geminiModel, nickname, remoteApiKey, remoteModel])

  const checkModel = useCallback(async () => {
    setModelState('checking')

    if (apiMode === 'gemini') {
      if (!geminiApiKey.trim()) {
        setModelState('missing')
        setModelMessage('Gemini API 키가 없습니다. Google AI Studio에서 발급한 키를 입력해 주세요.')
        return
      }
      setInstalledModels([])
      setModelState('ready')
      setModelMessage(`Gemini API 준비됨: ${geminiModel}`)
      return
    }

    if (apiMode === 'openrouter') {
      if (!remoteApiKey.trim()) {
        setModelState('missing')
        setModelMessage('OpenRouter API 키가 없습니다. 배포된 앱에서 OpenRouter를 쓰려면 키를 입력해 주세요.')
        return
      }
      setInstalledModels([])
      setModelState('ready')
      setModelMessage(`OpenRouter API 준비됨: ${remoteModel}`)
      return
    }

    setModelMessage('Ollama와 설치된 모델을 확인하는 중입니다.')
    try {
      const response = await fetch('/ollama/api/tags')
      if (!response.ok) throw new Error('Ollama 응답이 정상적이지 않습니다.')
      const data = await response.json()
      const names = (data.models || []).map((model: { name: string }) => model.name)
      setInstalledModels(names)

      if (names.includes(activeModel)) {
        setModelState('ready')
        setModelMessage(`${activeModel} 모델이 설치되어 있습니다.`)
      } else {
        setModelState('missing')
        setModelMessage(`${activeModel} 모델이 아직 설치되어 있지 않습니다.`)
      }
    } catch {
      setInstalledModels([])
      setModelState('offline')
      setModelMessage('Ollama가 꺼져 있거나, 방금 모델 실행 중 서버가 내려갔습니다.')
    }
  }, [activeModel, apiMode, geminiApiKey, geminiModel, remoteApiKey, remoteModel])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkModel()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [checkModel])

  function toggleFavorite(characterId: number) {
    setFavorites((current) =>
      current.includes(characterId) ? current.filter((id) => id !== characterId) : [...current, characterId],
    )
  }

  function openChat(character: Character) {
    setSelectedCharacter(character)
    setDetailCharacter(null)
    setSessions((current) => ({
      ...current,
      [character.id]: current[character.id] || createOpening(character, nickname),
    }))
    setCastByChat((current) => ({
      ...current,
      [character.id]: current[character.id] || [characterToCast(character)],
    }))
    setDraft('')
    setTab('chats')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  function startSpeakingAs(member: CastMember) {
    setDraft(`@${member.name} `)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function requestAnswer(nextMessages: ChatMessage[], character: Character) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 120000)
    const systemText = buildSystemPrompt(character, castByChat[character.id] || [characterToCast(character)], nickname)

    try {
      if (apiMode === 'local') {
        const response = await fetch('/ollama/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: activeModel,
            stream: false,
            options: { temperature: 0.84, top_p: 0.92 },
            messages: [{ role: 'system', content: systemText }, ...openAiMessages(nextMessages)],
          }),
        })
        if (!response.ok) throw new Error(`응답 오류 ${response.status}`)
        return stripModelReasoning(openAiText(await response.json()), character, nickname)
      }

      if (apiMode === 'openrouter') {
        if (!remoteApiKey.trim()) throw new Error('OpenRouter API 키가 없습니다.')
        const response = await fetch(openRouterEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${remoteApiKey.trim()}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'AI ChatBot',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: remoteModel,
            temperature: 0.84,
            top_p: 0.92,
            messages: [{ role: 'system', content: systemText }, ...openAiMessages(nextMessages)],
          }),
        })
        if (!response.ok) throw new Error(`응답 오류 ${response.status}`)
        return stripModelReasoning(openAiText(await response.json()), character, nickname)
      }

      if (!geminiApiKey.trim()) throw new Error('Gemini API 키가 없습니다.')
      const response = await fetch(geminiEndpoint(geminiModel), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey.trim() },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemText }] },
          contents: geminiContents(nextMessages),
          generationConfig: {
            temperature: 0.84,
            topP: 0.92,
          },
        }),
      })
      if (!response.ok) throw new Error(`응답 오류 ${response.status}`)
      return stripModelReasoning(geminiText(await response.json()), character, nickname)
    } finally {
      window.clearTimeout(timeout)
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = draftSpeaker
    if (!parsed.text || isSending || !selectedCharacter) return

    const userMessage = parsed.speaker ? newMessage('cast', parsed.text, parsed.speaker) : newMessage('user', parsed.text)
    const nextMessages = [...currentMessages, userMessage]
    setSessions((current) => ({ ...current, [selectedCharacter.id]: nextMessages }))
    setDraft('')
    setIsSending(true)

    try {
      const answer = await requestAnswer(nextMessages, selectedCharacter)
      if (!answer) throw new Error('빈 답변')
      setSessions((current) => ({
        ...current,
        [selectedCharacter.id]: [...nextMessages, newMessage('assistant', answer)],
      }))
      setModelState('ready')
      setModelMessage(`${apiMode === 'local' ? activeModel : apiMode === 'gemini' ? geminiModel : remoteModel} 모델이 정상 답변했습니다.`)
    } catch {
      const failure = [
        '모델 답변을 받지 못했습니다.',
        `현재 연결 방식: ${apiMode === 'local' ? '로컬 Ollama' : apiMode === 'gemini' ? 'Gemini API' : 'OpenRouter'}`,
        `현재 선택 모델: ${apiMode === 'local' ? activeModel : apiMode === 'gemini' ? geminiModel : remoteModel}`,
        apiMode === 'local'
          ? '32B 모델은 PC 메모리가 부족하면 Ollama가 내려갈 수 있습니다.'
          : 'API 키, 모델 이름, 무료 사용 한도를 확인해 주세요.',
      ].join('\n')
      setSessions((current) => ({
        ...current,
        [selectedCharacter.id]: [...nextMessages, newMessage('system', failure)],
      }))
      setModelState('error')
      setModelMessage('답변 생성 중 연결이 끊겼습니다. 연결 설정을 확인해 주세요.')
    } finally {
      setIsSending(false)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  async function testModelResponse() {
    setModelState('checking')
    setModelMessage(`${apiMode === 'local' ? activeModel : apiMode === 'gemini' ? geminiModel : remoteModel} 모델에 짧은 답변을 요청하는 중입니다.`)
    try {
      const fakeCharacter = selectedCharacter || baseCharacters[0]
      const answer = await requestAnswer([newMessage('user', '정상적으로 답변되는지 짧게 말해줘.')], fakeCharacter)
      if (!answer) throw new Error('빈 답변')
      setModelState('ready')
      setModelMessage(`답변 테스트 성공: ${answer.slice(0, 70)}`)
    } catch {
      setModelState('error')
      setModelMessage('답변 테스트 실패. API 키, 모델 이름, 사용 한도 또는 로컬 Ollama 상태를 확인해 주세요.')
    }
  }

  function applySuggestion(text: string) {
    setDraft(text)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function requestSuggestionBatch(pageIndex: number) {
    if (!selectedCharacter) return []
    const existing = scopedSuggestionPages.flatMap((page) => page.items).join('\n')
    const castNames = castMembers.map((member) => `@${member.name}`).join(', ')
    const prompt = [
      '현재 성인 로맨스 채팅 맥락을 보고 사용자가 다음에 입력할 만한 추천 프롬프트 3개를 만들어 주세요.',
      '추천은 사용자가 그대로 누르면 입력창에 들어갈 문장입니다.',
      '대사형, *상황 묘사*형, @이름으로 다른 인물의 말을 대신 쓰는 형식을 섞어도 됩니다.',
      '각 추천은 한국어로 55자 이내, JSON 배열만 출력하세요.',
      `사용자 닉네임: ${displayNickname(nickname)}`,
      `기본 캐릭터: ${selectedCharacter.title}`,
      `사용 가능한 @인물: ${castNames}`,
      existing ? `이미 보여준 추천은 다시 쓰지 마세요:\n${existing}` : '',
      `최근 대화:\n${suggestionContext(currentMessages, nickname)}`,
      `이번 추천 묶음 번호: ${pageIndex + 1}`,
    ].filter(Boolean).join('\n\n')

    if (apiMode === 'local') {
      const response = await fetch('/ollama/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeModel,
          stream: false,
          options: { temperature: 0.92, top_p: 0.95 },
          messages: [
            { role: 'system', content: '추천 문장 3개만 JSON 배열로 출력하세요. 설명은 쓰지 마세요.' },
            { role: 'user', content: prompt },
          ],
        }),
      })
      if (!response.ok) throw new Error('추천 응답 오류')
      return parseSuggestions(openAiText(await response.json()))
    }

    if (apiMode === 'openrouter') {
      if (!remoteApiKey.trim()) throw new Error('OpenRouter API 키가 없습니다.')
      const response = await fetch(openRouterEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${remoteApiKey.trim()}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI ChatBot',
        },
        body: JSON.stringify({
          model: remoteModel,
          temperature: 0.92,
          top_p: 0.95,
          messages: [
            { role: 'system', content: '추천 문장 3개만 JSON 배열로 출력하세요. 설명은 쓰지 마세요.' },
            { role: 'user', content: prompt },
          ],
        }),
      })
      if (!response.ok) throw new Error('추천 응답 오류')
      return parseSuggestions(openAiText(await response.json()))
    }

    if (!geminiApiKey.trim()) throw new Error('Gemini API 키가 없습니다.')
    const response = await fetch(geminiEndpoint(geminiModel), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey.trim() },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.92, topP: 0.95 },
      }),
    })
    if (!response.ok) throw new Error('추천 응답 오류')
    return parseSuggestions(geminiText(await response.json()))
  }

  async function addSuggestionPage() {
    if (!selectedCharacter || isSuggesting) return
    const pageIndex = scopedSuggestionPages.length
    setIsSuggesting(true)

    try {
      const aiItems = await requestSuggestionBatch(pageIndex)
      const items = aiItems.length >= 3 ? aiItems.slice(0, 3) : fallbackSuggestions(selectedCharacter, castMembers, nickname, pageIndex)
      setSuggestionPages((current) => [
        ...current.filter((page) => !page.id.startsWith(currentMessageFingerprint)),
        ...scopedSuggestionPages,
        { id: `${currentMessageFingerprint}-${pageIndex}`, items },
      ])
      setActiveSuggestionPage(pageIndex)
    } catch {
      setSuggestionPages((current) => [
        ...current.filter((page) => !page.id.startsWith(currentMessageFingerprint)),
        ...scopedSuggestionPages,
        { id: `${currentMessageFingerprint}-${pageIndex}-fallback`, items: fallbackSuggestions(selectedCharacter, castMembers, nickname, pageIndex) },
      ])
      setActiveSuggestionPage(pageIndex)
    } finally {
      setIsSuggesting(false)
    }
  }

  function showPreviousSuggestions() {
    setActiveSuggestionPage(Math.max(0, normalizedActiveSuggestionPage - 1))
  }

  function showNextSuggestions() {
    if (normalizedActiveSuggestionPage < scopedSuggestionPages.length - 1) {
      setActiveSuggestionPage(normalizedActiveSuggestionPage + 1)
      return
    }
    void addSuggestionPage()
  }

  function handleSuggestionTouchEnd(clientX: number) {
    if (suggestionTouchStart.current === null) return
    const delta = clientX - suggestionTouchStart.current
    suggestionTouchStart.current = null
    if (Math.abs(delta) < 42) return
    if (delta > 0) {
      showPreviousSuggestions()
      return
    }
    showNextSuggestions()
  }

  async function suggestCastProfile() {
    setCastHelper('AI가 인물 설정을 추천하는 중입니다.')
    try {
      if (!geminiApiKey.trim()) {
        setCastHelper('AI 추천을 쓰려면 API 키를 먼저 입력해 주세요.')
        return
      }
      const prompt = [
        '성인 로맨스 창작 채팅에 추가할 가상 인물 설정을 JSON으로 추천해 주세요.',
        '모든 인물은 성인입니다.',
        `희망 이름: ${castName || '랜덤'}`,
        '형식: {"name":"이름","job":"직업","personality":"성격","traits":"특징","relationship":"현재 채팅 속 관계","hobbies":"취미","details":"추가 설정"}.',
        '한국어로 작성하고 JSON 외 문장은 쓰지 마세요.',
      ].join('\n')
      const response = await fetch(geminiEndpoint(geminiModel), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey.trim() },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.95 },
        }),
      })
      if (!response.ok) throw new Error('Gemini 응답 오류')
      const text = geminiText(await response.json())
      const jsonText = text.match(/\{[\s\S]*\}/)?.[0] || text
      const parsed = JSON.parse(jsonText) as Partial<CastMember>
      setCastName(parsed.name || castName)
      setCastJob(parsed.job || '')
      setCastPersonality(parsed.personality || '')
      setCastTraits(parsed.traits || '')
      setCastRelationship(parsed.relationship || '')
      setCastHobbies(parsed.hobbies || '')
      setCastDetails(parsed.details || '')
      setCastHelper('추천 설정을 채웠습니다. 필요하면 수정한 뒤 추가하세요.')
    } catch {
      setCastHelper('AI 추천에 실패했습니다. API 키와 모델 이름을 확인해 주세요.')
    }
  }

  function addCastMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCharacter || !castName.trim()) return
    const member: CastMember = {
      id: crypto.randomUUID(),
      name: castName.trim(),
      job: castJob.trim() || '새 인물',
      personality: castPersonality.trim() || '사용자가 직접 추가한 인물',
      traits: castTraits.trim(),
      relationship: castRelationship.trim(),
      hobbies: castHobbies.trim(),
      details: castDetails.trim() || '아직 상세 설정이 없습니다.',
      image: castImage.trim() || selectedCharacter.image,
    }
    setCastByChat((current) => ({
      ...current,
      [selectedCharacter.id]: [...(current[selectedCharacter.id] || [characterToCast(selectedCharacter)]), member],
    }))
    setAddCastOpen(false)
    setCastName('')
    setCastJob('')
    setCastPersonality('')
    setCastTraits('')
    setCastRelationship('')
    setCastHobbies('')
    setCastDetails('')
    setCastImage('')
    setCastHelper('')
  }

  function handleCastImageUpload(file?: File) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCastImage(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  function createCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = creatorName.trim()
    const intro = creatorIntro.trim()
    if (!name || !intro) return

    const custom: Character = {
      id: Date.now(),
      rank: characters.length + 1,
      views: '0',
      title: name,
      subtitle: intro.slice(0, 44),
      tags: ['커스텀', '로맨스', '성인'],
      author: 'me',
      image: `characters/character-${((characters.length % 6) + 1).toString()}.png`,
      job: '사용자 제작 캐릭터',
      genre: '일상/로맨스',
      personality: '사용자가 직접 적은 설정을 중심으로 반응합니다.',
      hobbies: '대화 안에서 함께 정해갈 수 있습니다.',
      preference: '사용자가 지정한 관계와 분위기를 우선합니다.',
      note: '새로 만든 캐릭터라 대화가 쌓일수록 설정이 선명해집니다.',
      tone: '사용자가 직접 만든 캐릭터 톤',
      speechGuide: '사용자가 적은 설정을 우선하고, 첫 대사부터 관계의 긴장감과 감정 목적이 드러나게 말합니다.',
      openingScene: `${withJosa(name, '이/가')} ${withJosa(displayNickname(nickname), '을/를')} 마주한 채, 방금 시작된 관계의 분위기를 조용히 가늠한다.`,
      openingLine: '좋아, 지금부터 네가 원하는 분위기로 시작해 보자. 먼저 어디까지 들어올 건지 말해 봐.',
      intro,
      gallery: galleryRow(characters.length % 6, ['기본 컷', '다른 분위기', '추가 무드']),
    }

    setCharacters((current) => [custom, ...current])
    setCreatorName('')
    setCreatorIntro('')
    setDetailCharacter(custom)
    setTab('home')
  }

  if (selectedCharacter) {
    return (
      <main className="phone-shell chat-view">
        <header className="detail-header">
          <button type="button" onClick={() => setSelectedCharacter(null)} aria-label="뒤로 가기">
            <Icon name="back" />
          </button>
          <div>
            <strong>{selectedCharacter.title}</strong>
            <span className={modelState}>{isSending ? '답변 작성 중' : apiMode === 'gemini' ? geminiModel : apiMode === 'local' ? activeModel : remoteModel}</span>
          </div>
          <div className="chat-header-actions">
            <button type="button" onClick={() => setAddCastOpen(true)} aria-label="인물 추가">
              <Icon name="plus" />
            </button>
            <button type="button" onClick={() => toggleFavorite(selectedCharacter.id)} aria-label="즐겨찾기">
              <Icon name={favorites.includes(selectedCharacter.id) ? 'heartFilled' : 'heart'} />
            </button>
          </div>
        </header>

        <section className="profile-strip">
          <img src={assetPath(selectedCharacter.image)} alt="" />
          <div>
            <p>{personalize(selectedCharacter.subtitle, nickname)}</p>
            <small>@{selectedCharacter.author} · {selectedCharacter.tone}</small>
          </div>
        </section>

        <section className="cast-strip" aria-label="등장인물">
          {castMembers.map((member) => (
            <button className={draftSpeaker.speaker?.id === member.id ? 'active' : ''} key={member.id} type="button" onClick={() => startSpeakingAs(member)}>
              <img src={assetPath(member.image)} alt="" />
              <span>@{member.name}</span>
            </button>
          ))}
        </section>

        <section className="chat-log" aria-live="polite">
          {currentMessages.map((message) => (
            <article className={`bubble ${message.sender}`} key={message.id}>
              {message.sender === 'cast' && (
                <header>
                  {message.speakerImage && <img src={assetPath(message.speakerImage)} alt="" />}
                  <strong>@{message.speakerName}</strong>
                </header>
              )}
              <p>
                <MessageText text={message.text} />
              </p>
              <time>{message.time}</time>
            </article>
          ))}
          {isSending && (
            <article className="bubble assistant typing">
              <p>답변을 작성하는 중...</p>
            </article>
          )}
        </section>

        <section className="suggestion-panel" aria-label="추천 답변">
          <div className="suggestion-header">
            <span>
              <Icon name="sparkles" />
              추천 답변
            </span>
            <small>{normalizedActiveSuggestionPage + 1} / {Math.max(scopedSuggestionPages.length, 1)}</small>
            <div>
              <button type="button" onClick={showPreviousSuggestions} disabled={normalizedActiveSuggestionPage === 0} aria-label="이전 추천">
                <Icon name="chevronLeft" />
              </button>
              <button type="button" onClick={showNextSuggestions} disabled={isSuggesting} aria-label="다음 추천">
                <Icon name="chevronRight" />
              </button>
            </div>
          </div>
          <div
            className="suggestion-cards"
            onTouchStart={(event) => {
              suggestionTouchStart.current = event.touches[0]?.clientX ?? null
            }}
            onTouchEnd={(event) => handleSuggestionTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
          >
            {activeSuggestions.map((reply) => (
              <button key={reply} type="button" onClick={() => applySuggestion(reply)}>
                {reply}
              </button>
            ))}
            {isSuggesting && <span className="suggestion-loading">새 추천을 만드는 중...</span>}
          </div>
        </section>

        <form className="mobile-composer" onSubmit={sendMessage}>
          <div className={`composer-box ${draftSpeaker.speaker ? 'speaking-as' : mentionStarted ? 'mentioning' : ''}`}>
            {draftSpeaker.speaker ? (
              <div className="speaker-mode">
                <img src={assetPath(draftSpeaker.speaker.image)} alt="" />
                <div>
                  <strong>@{draftSpeaker.speaker.name}의 말로 입력 중</strong>
                  <span>{draftSpeaker.text ? '이 대사는 해당 인물의 채팅으로 전송됩니다.' : '이름 뒤에 대사를 이어서 입력하세요.'}</span>
                </div>
              </div>
            ) : mentionStarted ? (
              <div className="speaker-mode warning">
                <div>
                  <strong>등록된 인물 이름을 찾지 못했어요</strong>
                  <span>아래 인물 버튼을 누르면 @이름이 정확히 입력됩니다.</span>
                </div>
              </div>
            ) : null}
            <textarea
              ref={inputRef}
              rows={2}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="메시지를 입력하세요"
            />
          </div>
          <button type="submit" disabled={!draftSpeaker.text || isSending}>
            <Icon name="send" />
            <span>전송</span>
          </button>
        </form>

        {addCastOpen && (
          <section className="cast-modal" aria-label="인물 추가">
            <button className="sheet-backdrop" type="button" onClick={() => setAddCastOpen(false)} aria-label="닫기"></button>
            <form className="cast-modal-content" onSubmit={addCastMember}>
              <h2>채팅에 인물 추가</h2>
              <p>추가한 인물은 @이름으로 직접 말하게 할 수 있습니다.</p>
              {castHelper && <div className="helper-message">{castHelper}</div>}
              <label>
                이름
                <input value={castName} onChange={(event) => setCastName(event.target.value)} placeholder="예: 한도윤" />
              </label>
              <label>
                직업/역할
                <input value={castJob} onChange={(event) => setCastJob(event.target.value)} placeholder="예: 바텐더, 선배, 라이벌" />
              </label>
              <label>
                성격
                <input value={castPersonality} onChange={(event) => setCastPersonality(event.target.value)} placeholder="예: 다정하지만 질투가 많음" />
              </label>
              <label>
                특징
                <textarea rows={2} value={castTraits} onChange={(event) => setCastTraits(event.target.value)} placeholder="예: 말투, 분위기, 숨기는 점" />
              </label>
              <label>
                관계
                <textarea rows={2} value={castRelationship} onChange={(event) => setCastRelationship(event.target.value)} placeholder="예: 주인공의 전 애인, 오래된 친구, 라이벌" />
              </label>
              <label>
                취미
                <input value={castHobbies} onChange={(event) => setCastHobbies(event.target.value)} placeholder="예: 야경 산책, 와인, 음악" />
              </label>
              <label>
                추가 설정
                <textarea rows={3} value={castDetails} onChange={(event) => setCastDetails(event.target.value)} placeholder="대화에 꼭 반영하고 싶은 내용을 적어주세요." />
              </label>
              <label>
                사진 URL
                <input value={castImage.startsWith('data:') ? '업로드한 이미지 사용 중' : castImage} onChange={(event) => setCastImage(event.target.value)} placeholder="https://..." />
              </label>
              {castImage && (
                <div className="cast-image-preview">
                  <img src={assetPath(castImage)} alt="" />
                  <span>선택한 사진</span>
                </div>
              )}
              <label className="upload-tile">
                <input type="file" accept="image/*" onChange={(event) => handleCastImageUpload(event.target.files?.[0])} />
                <span>
                  <Icon name="image" />
                  내 사진 선택
                </span>
              </label>
              <div className="sheet-actions">
                <button type="button" onClick={suggestCastProfile}>
                  <Icon name="sparkles" />
                  AI로 추천
                </button>
                <button type="submit" disabled={!castName.trim()}>
                  인물 추가
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    )
  }

  return (
    <main className="phone-shell ranking-view">
      <header className="top-bar">
        <nav aria-label="상단 메뉴">
          <button className="active" type="button" onClick={() => setTab('home')}>
            홈
          </button>
          <button type="button" onClick={() => setTab('home')}>
            랭킹
          </button>
        </nav>
        <div className="top-actions">
          <button className="search-button" type="button" onClick={() => setSearchOpen((value) => !value)} aria-label="검색">
            <Icon name="search" />
          </button>
          <button className="login-button" type="button" onClick={() => setTab('my')}>
            {nickname ? displayNickname(nickname) : '설정'}
          </button>
        </div>
      </header>

      {searchOpen && (
        <section className="search-panel">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="캐릭터, 태그, 작가 검색" autoFocus />
          <button type="button" onClick={() => setQuery('')}>
            지우기
          </button>
        </section>
      )}

      {tab === 'home' && (
        <>
          <section className="ranking-tabs" aria-label="랭킹 종류">
            {rankTabs.map((item) => (
              <button className={rankTab === item ? 'active' : ''} key={item} type="button" onClick={() => setRankTab(item)}>
                {item}
              </button>
            ))}
            <button type="button">남성 인기순⌄</button>
          </section>

          <section className="category-strip" aria-label="장르">
            {categories.map((category) => (
              <button
                className={activeCategory === category ? 'active' : ''}
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </section>

          <section className="status-card">
            <span className={`dot ${modelState}`}></span>
            <div>
              <strong>{modelState === 'ready' ? '모델 준비됨' : '모델 확인 필요'}</strong>
              <p>{modelMessage}</p>
            </div>
            <button type="button" onClick={checkModel}>
              확인
            </button>
          </section>

          <section className="card-grid" aria-label="캐릭터 랭킹">
            {visibleCharacters.map((character) => (
              <button className="ranking-card" key={character.id} type="button" onClick={() => setDetailCharacter(character)}>
                <img src={assetPath(character.image)} alt="" />
                <div className="rank-badge">{character.rank}</div>
                <div className="view-badge">● {character.views}</div>
                <div className="favorite-badge">{favorites.includes(character.id) ? '♥' : '♡'}</div>
                <div className="card-copy">
                  <h2>{character.title}</h2>
                  <p>{personalize(character.subtitle, nickname)}</p>
                  <span>#{character.tags.join(' #')}</span>
                  <small>@{character.author}</small>
                </div>
              </button>
            ))}
          </section>
        </>
      )}

      {tab === 'chats' && (
        <section className="list-page">
          <h1>대화</h1>
          {chattedCharacters.length === 0 && <p className="empty">아직 시작한 대화가 없습니다. 홈에서 캐릭터를 선택해 주세요.</p>}
          {chattedCharacters.map((character) => {
            const last = sessions[character.id]?.at(-1)
            return (
              <button className="chat-row" key={character.id} type="button" onClick={() => openChat(character)}>
                <img src={assetPath(character.image)} alt="" />
                <div>
                  <strong>{character.title}</strong>
                  <p>{last?.text || character.subtitle}</p>
                </div>
                <time>{last?.time}</time>
              </button>
            )
          })}
        </section>
      )}

      {tab === 'create' && (
        <section className="create-page">
          <h1>캐릭터 제작</h1>
          <form onSubmit={createCharacter}>
            <label>
              캐릭터 이름
              <input value={creatorName} onChange={(event) => setCreatorName(event.target.value)} placeholder="예: 서윤" />
            </label>
            <label>
              캐릭터 설정
              <textarea
                rows={6}
                value={creatorIntro}
                onChange={(event) => setCreatorIntro(event.target.value)}
                placeholder="말투, 관계, 첫 상황을 적어 주세요."
              />
            </label>
            <button type="submit" disabled={!creatorName.trim() || !creatorIntro.trim()}>
              캐릭터 만들기
            </button>
          </form>
        </section>
      )}

      {tab === 'my' && (
        <section className="my-page">
          <h1>마이페이지</h1>
          <div className="profile-panel">
            <div>
              <h2>내 닉네임</h2>
              <p>AI가 더 이상 Guest라고 부르지 않고 이 이름으로 불러요.</p>
            </div>
            <label>
              닉네임
              <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="예: 민준" />
            </label>
          </div>
          <div className="model-panel">
            <h2>연결 설정</h2>
            <p className={`model-message ${modelState}`}>{modelMessage}</p>
            <div className="mode-toggle" aria-label="연결 방식">
              <button className={apiMode === 'local' ? 'active' : ''} type="button" onClick={() => setApiMode('local')}>
                로컬
              </button>
              <button className={apiMode === 'gemini' ? 'active' : ''} type="button" onClick={() => setApiMode('gemini')}>
                Gemini
              </button>
              <button className={apiMode === 'openrouter' ? 'active' : ''} type="button" onClick={() => setApiMode('openrouter')}>
                OpenRouter
              </button>
            </div>

            {apiMode === 'local' && (
              <>
                {modelOptions.map((model) => (
                  <button
                    className={activeModel === model.name ? 'model-option active' : 'model-option'}
                    key={model.name}
                    type="button"
                    onClick={() => setActiveModel(model.name)}
                  >
                    <strong>{model.label}</strong>
                    <span>{model.name}</span>
                    <small>{model.note}</small>
                    <em>{installedModels.includes(model.name) ? '설치됨' : '설치 필요'}</em>
                  </button>
                ))}
                <div className="command-box">ollama run {activeModel}</div>
              </>
            )}

            {apiMode === 'gemini' && (
              <div className="remote-config">
                <label>
                  Gemini API 키
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(event) => setGeminiApiKey(event.target.value)}
                    placeholder="Google AI Studio API 키"
                  />
                </label>
                <label>
                  Gemini 모델 이름
                  <input value={geminiModel} onChange={(event) => setGeminiModel(event.target.value)} placeholder="gemma-4-31b-it" />
                </label>
                <p>Google AI Studio에서 받은 Gemini API 키를 넣으면 Gemma 4 31B IT 모델을 호출할 수 있습니다. 무료 한도와 정책은 Google 계정 상태에 따라 달라질 수 있습니다.</p>
              </div>
            )}

            {apiMode === 'openrouter' && (
              <div className="remote-config">
                <label>
                  OpenRouter API 키
                  <input
                    type="password"
                    value={remoteApiKey}
                    onChange={(event) => setRemoteApiKey(event.target.value)}
                    placeholder="sk-or-..."
                  />
                </label>
                <label>
                  OpenRouter 모델 이름
                  <input value={remoteModel} onChange={(event) => setRemoteModel(event.target.value)} placeholder="google/gemma-4-31b-it:free" />
                </label>
                <p>OpenRouter 무료 모델을 쓰려면 모델 이름에 `:free`가 붙은 모델을 입력하세요.</p>
              </div>
            )}

            <button className="primary-action" type="button" onClick={checkModel}>
              연결 상태 확인
            </button>
            <button className="secondary-action" type="button" onClick={testModelResponse}>
              짧은 답변 테스트
            </button>
          </div>
        </section>
      )}

      {detailCharacter && (
        <section className="detail-sheet" aria-label="캐릭터 상세">
          <button className="sheet-backdrop" type="button" onClick={() => setDetailCharacter(null)} aria-label="닫기"></button>
          <div className="sheet-content character-detail-card">
            <button className="sheet-close" type="button" onClick={() => setDetailCharacter(null)}>
              <Icon name="x" />
            </button>
            <div className="detail-hero">
              <button
                className="detail-hero-photo"
                type="button"
                onClick={() => setPhotoPreview({ image: detailCharacter.image, label: detailCharacter.title })}
                aria-label={`${detailCharacter.title} 사진 크게 보기`}
              >
                <img src={assetPath(detailCharacter.image)} alt="" />
              </button>
              <div>
                <span>{detailCharacter.genre}</span>
                <h1>{detailCharacter.title}</h1>
                <p>{personalize(detailCharacter.subtitle, nickname)}</p>
              </div>
            </div>
            <div className="sheet-copy">
              <div className="tag-line">#{detailCharacter.tags.join(' #')}</div>
              <p className="detail-intro">{personalize(detailCharacter.intro, nickname)}</p>
              <h2 className="detail-section-title">캐릭터 특징</h2>
              <dl className="character-profile-grid">
                <div>
                  <dt>직업/역할</dt>
                  <dd>{detailCharacter.job}</dd>
                </div>
                <div>
                  <dt>성격</dt>
                  <dd>{detailCharacter.personality}</dd>
                </div>
                <div>
                  <dt>취미</dt>
                  <dd>{detailCharacter.hobbies}</dd>
                </div>
                <div>
                  <dt>취향</dt>
                  <dd>{detailCharacter.preference}</dd>
                </div>
                <div className="wide">
                  <dt>특이사항</dt>
                  <dd>{detailCharacter.note}</dd>
                </div>
              </dl>
              <div className="photo-gallery" aria-label="추가 사진">
                {detailCharacter.gallery.map((photo) => (
                  <button
                    className="gallery-thumb"
                    key={`${photo.row}-${photo.col}-${photo.label}`}
                    type="button"
                    onClick={() => setPhotoPreview(photo)}
                    aria-label={`${photo.label} 사진 크게 보기`}
                    style={{
                      backgroundImage: `url(${assetPath(photo.image)})`,
                      backgroundPosition: galleryPosition(photo),
                    }}
                  >
                    <span>{photo.label}</span>
                  </button>
                ))}
              </div>
              <div className="sheet-actions">
                <button type="button" onClick={() => toggleFavorite(detailCharacter.id)}>
                  {favorites.includes(detailCharacter.id) ? '즐겨찾기 해제' : '즐겨찾기'}
                </button>
                <button type="button" onClick={() => openChat(detailCharacter)}>
                  대화 시작
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {photoPreview && (
        <section className="photo-viewer" aria-label="사진 크게 보기">
          <button className="sheet-backdrop" type="button" onClick={() => setPhotoPreview(null)} aria-label="닫기"></button>
          <div className="photo-viewer-content">
            <button className="photo-viewer-close" type="button" onClick={() => setPhotoPreview(null)} aria-label="닫기">
              <Icon name="x" />
            </button>
            {photoPreview.row === undefined || photoPreview.col === undefined ? (
              <img src={assetPath(photoPreview.image)} alt="" />
            ) : (
              <div
                className="photo-viewer-crop"
                style={{
                  backgroundImage: `url(${assetPath(photoPreview.image)})`,
                  backgroundPosition: galleryPosition(photoPreview as CharacterPhoto),
                }}
              ></div>
            )}
            <strong>{photoPreview.label}</strong>
          </div>
        </section>
      )}

      <nav className="bottom-nav" aria-label="하단 메뉴">
        <button className={tab === 'home' ? 'active' : ''} type="button" onClick={() => setTab('home')}>
          <Icon name="home" />
          홈
        </button>
        <button className={tab === 'chats' ? 'active' : ''} type="button" onClick={() => setTab('chats')}>
          <Icon name="chat" />
          대화
        </button>
        <button className={tab === 'create' ? 'active' : ''} type="button" onClick={() => setTab('create')}>
          <Icon name="plus" />
          제작
        </button>
        <button className={tab === 'my' ? 'active' : ''} type="button" onClick={() => setTab('my')}>
          <Icon name="user" />
          마이페이지
        </button>
      </nav>
    </main>
  )
}

export default App
