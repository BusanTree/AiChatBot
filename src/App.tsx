import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import './App.css'

import { Icon } from './components/Icon'
import { categories, characters as baseCharacters, galleryPosition } from './data/characters'
import { callGemini } from './lib/gemini'
import {
  buildSystemPrompt,
  characterOpeningScene,
  characterToCast,
  cleanupReply,
  createOpening,
  displayNickname,
  fallbackSuggestions,
  mentionAliases,
  nowTime,
  parseCastProfile,
  parseSpeakerDraft,
  parseSuggestions,
  personalize,
  richSegments,
  suggestionContext,
} from './lib/prompt'
import {
  clearProfile,
  decodeGoogleCredential,
  getGoogleClientId,
  getStoredProfile,
  loadGoogleScript,
  saveGoogleClientId,
  saveProfile,
  type GoogleProfile,
} from './lib/auth'
import { loadJSON, loadString, saveJSON, saveString } from './lib/storage'
import type {
  CastMember,
  Character,
  CharacterPhoto,
  ChatMessage,
  ChatSession,
  ModelState,
  Sender,
  Tab,
} from './types'

const DEFAULT_GEMINI_MODEL = 'gemma-3-27b-it'

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

function assetPath(path: string) {
  if (path.startsWith('data:') || path.startsWith('http')) return path
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

function nowStamp() {
  return Date.now()
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

function sessionTitle(character: Character, index: number) {
  return `${character.title} #${index + 1}`
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

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [activeCategory, setActiveCategory] = useState<string>(categories[0])
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const [characters, setCharacters] = useState<Character[]>(() =>
    loadJSON<Character[] | null>('customCharacters', null)
      ? [...(loadJSON<Character[]>('customCharacters', []) || []), ...baseCharacters]
      : baseCharacters,
  )
  const [favorites, setFavorites] = useState<number[]>(() => loadJSON<number[]>('favorites', []))
  const [sessions, setSessions] = useState<Record<string, ChatSession>>(() =>
    loadJSON<Record<string, ChatSession>>('sessions', {}),
  )

  const [detailCharacter, setDetailCharacter] = useState<Character | null>(null)
  const [photoPreview, setPhotoPreview] = useState<PhotoPreview | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)

  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => loadString('geminiApiKey'))
  const [geminiModel, setGeminiModel] = useState<string>(
    () => loadString('geminiModel') || DEFAULT_GEMINI_MODEL,
  )
  const [nickname, setNickname] = useState<string>(() => loadString('nickname'))
  const [modelState, setModelState] = useState<ModelState>(() =>
    loadString('geminiApiKey').trim() ? 'ready' : 'missing',
  )
  const [modelMessage, setModelMessage] = useState<string>(() =>
    loadString('geminiApiKey').trim()
      ? `Gemini 준비됨 · ${loadString('geminiModel') || DEFAULT_GEMINI_MODEL}`
      : 'Gemini API 키를 입력하면 바로 대화를 시작할 수 있어요.',
  )

  const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(() => getStoredProfile())
  const [googleClientId, setGoogleClientId] = useState<string>(() => getGoogleClientId())
  const [googleError, setGoogleError] = useState<string>('')
  const [gisReady, setGisReady] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement | null>(null)

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
  const [isCastSuggesting, setIsCastSuggesting] = useState(false)

  const [suggestionPages, setSuggestionPages] = useState<SuggestionPage[]>([])
  const [activeSuggestionPage, setActiveSuggestionPage] = useState(0)
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const suggestionTouchStart = useRef<number | null>(null)

  useEffect(() => saveString('geminiApiKey', geminiApiKey), [geminiApiKey])
  useEffect(() => saveString('geminiModel', geminiModel), [geminiModel])
  useEffect(() => saveString('nickname', nickname), [nickname])
  useEffect(() => saveJSON('favorites', favorites), [favorites])
  useEffect(() => saveJSON('sessions', sessions), [sessions])
  useEffect(() => {
    const custom = characters.filter((character) =>
      !baseCharacters.some((base) => base.id === character.id),
    )
    saveJSON('customCharacters', custom)
  }, [characters])

  useEffect(() => {
    if (!googleClientId) return
    let cancelled = false
    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (!response.credential) return
            const profile = decodeGoogleCredential(response.credential)
            if (!profile) {
              setGoogleError('구글 로그인 응답을 처리하지 못했습니다.')
              return
            }
            saveProfile(profile)
            setGoogleProfile(profile)
            setGoogleError('')
            setNickname((current) => current.trim() || profile.name || current)
          },
          auto_select: false,
          use_fedcm_for_prompt: true,
        })
        setGisReady(true)
      })
      .catch(() => setGoogleError('구글 로그인 스크립트를 불러오지 못했습니다.'))

    return () => {
      cancelled = true
    }
  }, [googleClientId])

  useEffect(() => {
    if (!gisReady || googleProfile) return
    const slot = googleButtonRef.current
    if (!slot) return
    slot.innerHTML = ''
    window.google?.accounts?.id?.renderButton(slot, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      text: 'signin_with',
      logo_alignment: 'left',
      locale: 'ko',
    })
  }, [gisReady, googleProfile, tab])

  const visibleCharacters = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return characters.filter((character) => {
      const matchCategory =
        activeCategory === '전체' ||
        character.genre === activeCategory ||
        character.tags.includes(activeCategory)
      const haystack = [character.title, character.subtitle, character.author, character.tags.join(' ')]
        .join(' ')
        .toLowerCase()
      return matchCategory && (!keyword || haystack.includes(keyword))
    })
  }, [activeCategory, characters, query])

  const selectedSession = selectedSessionId ? sessions[selectedSessionId] : null
  const currentMessages = selectedSession?.messages || []
  const castMembers = useMemo(() => {
    if (selectedSession) return selectedSession.castMembers
    if (selectedCharacter) return [characterToCast(selectedCharacter)]
    return []
  }, [selectedCharacter, selectedSession])

  const draftSpeaker = useMemo(() => parseSpeakerDraft(draft, castMembers), [castMembers, draft])
  const mentionStarted = draft.trimStart().startsWith('@')
  const currentMessageFingerprint =
    selectedCharacter && selectedSession
      ? `${selectedSession.id}-${currentMessages.length}-${currentMessages[currentMessages.length - 1]?.id || 'empty'}`
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

  const normalizedActiveSuggestionPage = Math.min(
    activeSuggestionPage,
    Math.max(scopedSuggestionPages.length - 1, 0),
  )
  const activeSuggestions = scopedSuggestionPages[normalizedActiveSuggestionPage]?.items || []

  const chatSessions = useMemo(
    () =>
      Object.values(sessions)
        .map((session) => ({
          session,
          character: characters.find((character) => character.id === session.characterId),
        }))
        .filter((item): item is { session: ChatSession; character: Character } => Boolean(item.character))
        .sort((a, b) => b.session.updatedAt - a.session.updatedAt),
    [characters, sessions],
  )

  const checkModel = useCallback(() => {
    if (!geminiApiKey.trim()) {
      setModelState('missing')
      setModelMessage('Gemini API 키가 없습니다. Google AI Studio에서 무료 키를 발급받아 아래에 넣어주세요.')
      return
    }
    setModelState('ready')
    setModelMessage(`Gemini 준비됨 · ${geminiModel}`)
  }, [geminiApiKey, geminiModel])

  function toggleFavorite(characterId: number) {
    setFavorites((current) =>
      current.includes(characterId) ? current.filter((id) => id !== characterId) : [...current, characterId],
    )
  }

  function openChat(character: Character) {
    const existingCount = Object.values(sessions).filter((session) => session.characterId === character.id).length
    const stamp = nowStamp()
    const session: ChatSession = {
      id: crypto.randomUUID(),
      characterId: character.id,
      title: sessionTitle(character, existingCount),
      messages: [createOpening(character, nickname)],
      castMembers: [characterToCast(character)],
      createdAt: stamp,
      updatedAt: stamp,
    }
    setSelectedCharacter(character)
    setSelectedSessionId(session.id)
    setDetailCharacter(null)
    setSessions((current) => ({ ...current, [session.id]: session }))
    setDraft('')
    setIsSuggestionsOpen(false)
    setActiveSuggestionPage(0)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  function openExistingSession(session: ChatSession, character: Character) {
    setSelectedCharacter(character)
    setSelectedSessionId(session.id)
    setDetailCharacter(null)
    setDraft('')
    setIsSuggestionsOpen(false)
    setActiveSuggestionPage(0)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  function deleteSession(sessionId: string) {
    if (!window.confirm('이 대화를 삭제할까요? 되돌릴 수 없습니다.')) return
    setSessions((current) => {
      const next = { ...current }
      delete next[sessionId]
      return next
    })
    setSuggestionPages((current) => current.filter((page) => !page.id.startsWith(sessionId)))
    if (selectedSessionId === sessionId) {
      setSelectedCharacter(null)
      setSelectedSessionId(null)
      setDraft('')
      setIsSuggestionsOpen(false)
    }
  }

  function exitChat() {
    setSelectedCharacter(null)
    setSelectedSessionId(null)
    setIsSuggestionsOpen(false)
  }

  function startSpeakingAs(member: CastMember) {
    setDraft(`@${member.name} `)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function requestAnswer(messages: ChatMessage[], character: Character) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 120000)
    try {
      const systemInstruction = buildSystemPrompt(
        character,
        selectedSession?.castMembers || [characterToCast(character)],
        nickname,
      )
      const text = await callGemini({
        apiKey: geminiApiKey,
        model: geminiModel,
        systemInstruction,
        messages,
        signal: controller.signal,
      })
      return cleanupReply(text, character, nickname)
    } finally {
      window.clearTimeout(timeout)
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = draftSpeaker
    if (!parsed.text || isSending || !selectedCharacter || !selectedSessionId) return

    const userMessage = parsed.speaker
      ? newMessage('cast', parsed.text, parsed.speaker)
      : newMessage('user', parsed.text)
    const nextMessages = [...currentMessages, userMessage]
    setSessions((current) => ({
      ...current,
      [selectedSessionId]: {
        ...current[selectedSessionId],
        messages: nextMessages,
        updatedAt: nowStamp(),
      },
    }))
    setDraft('')
    setIsSending(true)

    try {
      const answer = await requestAnswer(nextMessages, selectedCharacter)
      if (!answer) throw new Error('빈 답변')
      setSessions((current) => ({
        ...current,
        [selectedSessionId]: {
          ...current[selectedSessionId],
          messages: [...nextMessages, newMessage('assistant', answer)],
          updatedAt: nowStamp(),
        },
      }))
      setModelState('ready')
      setModelMessage(`Gemini 준비됨 · ${geminiModel}`)
    } catch {
      setSessions((current) => ({
        ...current,
        [selectedSessionId]: {
          ...current[selectedSessionId],
          messages: [
            ...nextMessages,
            newMessage('system', '답변을 받지 못했어요. API 키와 모델 이름, 무료 사용 한도를 확인해 주세요.'),
          ],
          updatedAt: nowStamp(),
        },
      }))
      setModelState('error')
      setModelMessage('답변 생성 중 문제가 발생했어요. 설정을 확인해 주세요.')
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
    if (!geminiApiKey.trim()) {
      setModelState('missing')
      setModelMessage('먼저 Gemini API 키를 입력해 주세요.')
      return
    }
    setModelState('checking')
    setModelMessage(`${geminiModel}에 짧은 답변을 요청하는 중입니다.`)
    try {
      const sample = baseCharacters[0]
      const answer = await requestAnswer([newMessage('user', '정상적으로 답변되는지 짧게 말해줘.')], sample)
      if (!answer) throw new Error('빈 답변')
      setModelState('ready')
      setModelMessage(`응답 성공: ${answer.slice(0, 70)}`)
    } catch {
      setModelState('error')
      setModelMessage('응답 실패. API 키 또는 모델 이름을 확인해 주세요.')
    }
  }

  function applySuggestion(text: string) {
    setDraft(text)
    setIsSuggestionsOpen(false)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function requestSuggestionBatch() {
    if (!selectedCharacter) return []
    const existing = scopedSuggestionPages.flatMap((page) => page.items).join('\n')
    const castNames = castMembers.map((member) => `@${member.name}`).join(', ')
    const prompt = [
      '현재 성인 로맨스 채팅 맥락을 보고 사용자가 다음에 입력할 만한 추천 프롬프트 3개를 만들어 주세요.',
      '각 추천은 사용자가 그대로 누르면 입력창에 들어갈 문장입니다.',
      '대사형, *상황 묘사*형, @이름으로 다른 인물의 말을 대신 쓰는 형식을 섞어도 됩니다.',
      '각 추천은 한국어로 55자 이내, JSON 배열만 출력하세요.',
      `사용자 닉네임: ${displayNickname(nickname)}`,
      `기본 캐릭터: ${selectedCharacter.title}`,
      `사용 가능한 @인물: ${castNames}`,
      existing ? `이미 보여준 추천은 다시 쓰지 마세요:\n${existing}` : '',
      `최근 대화:\n${suggestionContext(currentMessages, nickname)}`,
    ]
      .filter(Boolean)
      .join('\n\n')

    const text = await callGemini({
      apiKey: geminiApiKey,
      model: geminiModel,
      prompt,
      messages: [],
      temperature: 0.92,
      topP: 0.95,
    })
    return parseSuggestions(text)
  }

  async function addSuggestionPage() {
    if (!selectedCharacter || isSuggesting) return
    const pageIndex = scopedSuggestionPages.length
    setIsSuggesting(true)
    try {
      const aiItems = await requestSuggestionBatch()
      const items =
        aiItems.length >= 3
          ? aiItems.slice(0, 3)
          : fallbackSuggestions(selectedCharacter, castMembers, nickname, pageIndex)
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
        {
          id: `${currentMessageFingerprint}-${pageIndex}-fallback`,
          items: fallbackSuggestions(selectedCharacter, castMembers, nickname, pageIndex),
        },
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
    if (delta > 0) showPreviousSuggestions()
    else showNextSuggestions()
  }

  async function suggestCastProfile() {
    if (isCastSuggesting) return
    setIsCastSuggesting(true)
    setCastHelper('AI가 인물 설정을 추천하는 중입니다.')
    try {
      const prompt = [
        '성인 로맨스 창작 채팅에 추가할 가상 인물 설정을 JSON으로 추천해 주세요.',
        '모든 인물은 성인입니다.',
        selectedCharacter ? `현재 채팅의 기본 캐릭터: ${selectedCharacter.title}` : '',
        selectedCharacter ? `현재 채팅 분위기: ${selectedCharacter.intro}` : '',
        castMembers.length ? `이미 있는 인물: ${castMembers.map((member) => member.name).join(', ')}` : '',
        `희망 이름: ${castName || '랜덤'}`,
        '성인 간 합의된 로맨스 안에서 쓸 수 있는 관계 긴장감, 취향, 취미, 특징을 넣어 주세요.',
        '형식: {"name":"이름","job":"직업","personality":"성격","traits":"특징","relationship":"현재 채팅 속 관계","hobbies":"취미","details":"추가 설정"}',
        '모든 값은 한국어 문자열로 작성하고, JSON 외 문장은 쓰지 마세요.',
      ]
        .filter(Boolean)
        .join('\n')
      const text = await callGemini({
        apiKey: geminiApiKey,
        model: geminiModel,
        prompt,
        messages: [],
        temperature: 0.9,
        topP: 0.95,
      })
      const parsed = parseCastProfile(text)
      if (!parsed) throw new Error('parse fail')
      setCastName(parsed.name || castName)
      setCastJob(parsed.job || '')
      setCastPersonality(parsed.personality || '')
      setCastTraits(parsed.traits || '')
      setCastRelationship(parsed.relationship || '')
      setCastHobbies(parsed.hobbies || '')
      setCastDetails(parsed.details || '')
      setCastHelper('추천 설정을 채웠습니다. 필요하면 수정한 뒤 추가하세요.')
    } catch {
      setCastHelper('추천에 실패했어요. API 키와 모델 이름을 확인해 주세요.')
    } finally {
      setIsCastSuggesting(false)
    }
  }

  function addCastMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCharacter || !selectedSessionId || !castName.trim()) return
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
    setSessions((current) => ({
      ...current,
      [selectedSessionId]: {
        ...current[selectedSessionId],
        castMembers: [
          ...(current[selectedSessionId]?.castMembers || [characterToCast(selectedCharacter)]),
          member,
        ],
        updatedAt: nowStamp(),
      },
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
      id: nowStamp(),
      title: name,
      subtitle: intro.slice(0, 44),
      tags: ['커스텀', '로맨스', '성인'],
      author: googleProfile?.email.split('@')[0] || 'me',
      image: `characters/character-${((characters.length % 23) + 1).toString()}.png`,
      job: '사용자 제작 캐릭터',
      genre: '일상/로맨스',
      personality: '사용자가 직접 적은 설정을 중심으로 반응합니다.',
      hobbies: '대화 안에서 함께 정해갈 수 있습니다.',
      preference: '사용자가 지정한 관계와 분위기를 우선합니다.',
      note: '새로 만든 캐릭터라 대화가 쌓일수록 설정이 선명해집니다.',
      tone: '사용자가 직접 만든 캐릭터 톤',
      speechGuide:
        '사용자가 적은 설정을 우선하고, 첫 대사부터 관계의 긴장감과 감정 목적이 드러나게 말합니다.',
      openingScene: `${name}이 ${displayNickname(nickname)}를 마주한 채, 방금 시작된 관계의 분위기를 조용히 가늠한다.`,
      openingLine: '좋아, 지금부터 네가 원하는 분위기로 시작해 보자. 먼저 어디까지 들어올 건지 말해 봐.',
      intro,
      gallery: [
        { image: `characters/character-${((characters.length % 23) + 1).toString()}.png`, row: 0, col: 0, label: '기본 컷' },
      ],
    }

    setCharacters((current) => [custom, ...current])
    setCreatorName('')
    setCreatorIntro('')
    setDetailCharacter(custom)
    setTab('home')
  }

  function signOut() {
    clearProfile()
    setGoogleProfile(null)
  }

  function applyGoogleClientId(value: string) {
    const cleaned = value.trim()
    setGoogleClientId(cleaned)
    saveGoogleClientId(cleaned)
    if (cleaned) setGoogleError('')
  }

  // Chat view
  if (selectedCharacter && selectedSession) {
    return (
      <main className="shell chat-view">
        <header className="chat-header">
          <button type="button" className="icon-btn" onClick={exitChat} aria-label="뒤로">
            <Icon name="back" />
          </button>
          <div className="chat-title">
            <strong>{selectedCharacter.title}</strong>
            <span className={modelState}>
              {isSending ? '답변을 작성하는 중…' : `${selectedSession.title} · ${geminiModel}`}
            </span>
          </div>
          <div className="chat-header-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setAddCastOpen(true)}
              aria-label="인물 추가"
            >
              <Icon name="plus" />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => toggleFavorite(selectedCharacter.id)}
              aria-label="즐겨찾기"
            >
              <Icon name={favorites.includes(selectedCharacter.id) ? 'heartFilled' : 'heart'} />
            </button>
          </div>
        </header>

        <section className="chat-profile">
          <img src={assetPath(selectedCharacter.image)} alt="" />
          <div>
            <p>{personalize(selectedCharacter.subtitle, nickname)}</p>
            <small>{characterOpeningScene(selectedCharacter, nickname).slice(0, 60)}…</small>
          </div>
        </section>

        <section className="cast-strip" aria-label="등장인물">
          {castMembers.map((member) => (
            <button
              key={member.id}
              className={draftSpeaker.speaker?.id === member.id ? 'active' : ''}
              type="button"
              onClick={() => startSpeakingAs(member)}
            >
              <img src={assetPath(member.image)} alt="" />
              <span>@{mentionAliases(member)[0] || member.name}</span>
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
              <p>
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </p>
            </article>
          )}
        </section>

        {isSuggestionsOpen ? (
          <section className="suggestion-panel" aria-label="추천 답변">
            <div className="suggestion-header">
              <span>
                <Icon name="sparkles" />
                추천 답변
              </span>
              <small>
                {normalizedActiveSuggestionPage + 1} / {Math.max(scopedSuggestionPages.length, 1)}
              </small>
              <div>
                <button
                  type="button"
                  onClick={showPreviousSuggestions}
                  disabled={normalizedActiveSuggestionPage === 0}
                  aria-label="이전 추천"
                >
                  <Icon name="chevronLeft" />
                </button>
                <button type="button" onClick={showNextSuggestions} disabled={isSuggesting} aria-label="다음 추천">
                  <Icon name="chevronRight" />
                </button>
                <button type="button" onClick={() => setIsSuggestionsOpen(false)} aria-label="닫기">
                  <Icon name="x" />
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
        ) : (
          <section className="suggestion-dock" aria-label="추천 답변 열기">
            <button type="button" onClick={() => setIsSuggestionsOpen(true)}>
              <Icon name="sparkles" />
              추천 답변 받기
            </button>
          </section>
        )}

        <form className="composer" onSubmit={sendMessage}>
          <div className={`composer-box ${draftSpeaker.speaker ? 'speaking-as' : mentionStarted ? 'mentioning' : ''}`}>
            {draftSpeaker.speaker ? (
              <div className="speaker-mode">
                <img src={assetPath(draftSpeaker.speaker.image)} alt="" />
                <div>
                  <strong>@{draftSpeaker.speaker.name}의 말로 입력 중</strong>
                  <span>{draftSpeaker.text ? '전송 시 해당 인물의 채팅으로 보내집니다.' : '이름 뒤에 대사를 이어서 입력하세요.'}</span>
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
          <button type="submit" disabled={!draftSpeaker.text || isSending} aria-label="전송">
            <Icon name="send" />
          </button>
        </form>

        {addCastOpen && (
          <section className="sheet cast-sheet" aria-label="인물 추가">
            <button className="sheet-backdrop" type="button" onClick={() => setAddCastOpen(false)} aria-label="닫기" />
            <form className="sheet-body" onSubmit={addCastMember}>
              <header>
                <h2>채팅에 인물 추가</h2>
                <button type="button" className="icon-btn" onClick={() => setAddCastOpen(false)} aria-label="닫기">
                  <Icon name="x" />
                </button>
              </header>
              <p className="sheet-hint">추가한 인물은 @이름으로 직접 말하게 할 수 있어요.</p>
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
                <input
                  value={castPersonality}
                  onChange={(event) => setCastPersonality(event.target.value)}
                  placeholder="예: 다정하지만 질투가 많음"
                />
              </label>
              <label>
                특징
                <textarea
                  rows={2}
                  value={castTraits}
                  onChange={(event) => setCastTraits(event.target.value)}
                  placeholder="예: 말투, 분위기, 숨기는 점"
                />
              </label>
              <label>
                관계
                <textarea
                  rows={2}
                  value={castRelationship}
                  onChange={(event) => setCastRelationship(event.target.value)}
                  placeholder="예: 전 연인, 오래된 친구"
                />
              </label>
              <label>
                취미
                <input value={castHobbies} onChange={(event) => setCastHobbies(event.target.value)} placeholder="예: 야경 산책, 와인" />
              </label>
              <label>
                추가 설정
                <textarea
                  rows={3}
                  value={castDetails}
                  onChange={(event) => setCastDetails(event.target.value)}
                  placeholder="대화에 꼭 반영하고 싶은 내용"
                />
              </label>
              {castImage && (
                <div className="cast-image-preview">
                  <img src={assetPath(castImage)} alt="" />
                  <span>선택한 사진</span>
                </div>
              )}
              <label className="upload-tile">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleCastImageUpload(event.target.files?.[0])}
                />
                <span>
                  <Icon name="image" />
                  사진 선택
                </span>
              </label>
              <div className="sheet-actions">
                <button type="button" className="ghost" onClick={suggestCastProfile} disabled={isCastSuggesting}>
                  <Icon name="sparkles" />
                  {isCastSuggesting ? '추천 중' : 'AI로 추천'}
                </button>
                <button type="submit" className="primary" disabled={!castName.trim()}>
                  인물 추가
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    )
  }

  // Landing screens
  return (
    <main className="shell landing-view">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            ✦
          </span>
          <strong>로맨스 AI</strong>
        </div>
        <div className="top-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setSearchOpen((value) => !value)}
            aria-label="검색"
          >
            <Icon name="search" />
          </button>
          {googleProfile ? (
            <button
              type="button"
              className="avatar-btn"
              onClick={() => setTab('my')}
              aria-label={`${googleProfile.name || '내 프로필'} 설정 열기`}
            >
              {googleProfile.picture ? (
                <img src={googleProfile.picture} alt="" referrerPolicy="no-referrer" />
              ) : (
                <Icon name="user" />
              )}
            </button>
          ) : (
            <button type="button" className="login-btn" onClick={() => setTab('my')}>
              로그인
            </button>
          )}
        </div>
      </header>

      {searchOpen && (
        <section className="search-panel">
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="캐릭터, 태그, 작가 검색"
            autoFocus
          />
          {query && (
            <button type="button" className="ghost-small" onClick={() => setQuery('')}>
              지우기
            </button>
          )}
        </section>
      )}

      {tab === 'home' && (
        <>
          <section className="category-strip" aria-label="장르">
            {categories.map((category) => (
              <button
                key={category}
                className={activeCategory === category ? 'active' : ''}
                type="button"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </section>

          <section className="card-grid" aria-label="캐릭터">
            {visibleCharacters.map((character) => (
              <div className="character-card-wrap" key={character.id}>
                <button
                  className="character-card"
                  type="button"
                  onClick={() => setDetailCharacter(character)}
                >
                  <img src={assetPath(character.image)} alt="" />
                  <div className="card-copy">
                    <h2>{character.title}</h2>
                    <p>{personalize(character.subtitle, nickname)}</p>
                    <div className="card-tags">
                      {character.tags.slice(0, 3).map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className={`favorite-chip ${favorites.includes(character.id) ? 'on' : ''}`}
                  onClick={() => toggleFavorite(character.id)}
                  aria-label={favorites.includes(character.id) ? '즐겨찾기 해제' : '즐겨찾기'}
                >
                  <Icon name={favorites.includes(character.id) ? 'heartFilled' : 'heart'} size={14} />
                </button>
              </div>
            ))}
            {visibleCharacters.length === 0 && (
              <div className="empty-state">
                <p>이 조건에 맞는 캐릭터가 없어요.</p>
                <button type="button" className="ghost-small" onClick={() => setActiveCategory('전체')}>
                  전체 보기
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'chats' && (
        <section className="list-page">
          <h1>대화</h1>
          {chatSessions.length === 0 ? (
            <div className="empty-state">
              <p>아직 시작한 대화가 없어요.</p>
              <button type="button" className="primary" onClick={() => setTab('home')}>
                홈에서 캐릭터 고르기
              </button>
            </div>
          ) : (
            chatSessions.map(({ session, character }) => {
              const last = session.messages.at(-1)
              return (
                <div className="chat-row-wrap" key={session.id}>
                  <button type="button" className="chat-row" onClick={() => openExistingSession(session, character)}>
                    <img src={assetPath(character.image)} alt="" />
                    <div>
                      <strong>{session.title}</strong>
                      <span>{character.title}</span>
                      <p>{last?.text.slice(0, 80) || character.subtitle}</p>
                    </div>
                    <time>{last?.time}</time>
                  </button>
                  <button
                    type="button"
                    className="chat-delete"
                    onClick={() => deleteSession(session.id)}
                    aria-label={`${session.title} 삭제`}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              )
            })
          )}
        </section>
      )}

      {tab === 'create' && (
        <section className="create-page">
          <h1>캐릭터 제작</h1>
          <p className="create-hint">이름과 짧은 설정만 입력하면 내 캐릭터로 저장돼요. 나머지 대화는 AI가 채워 줘요.</p>
          <form onSubmit={createCharacter}>
            <label>
              캐릭터 이름
              <input value={creatorName} onChange={(event) => setCreatorName(event.target.value)} placeholder="예: 서윤" />
            </label>
            <label>
              캐릭터 설정
              <textarea
                rows={8}
                value={creatorIntro}
                onChange={(event) => setCreatorIntro(event.target.value)}
                placeholder={'말투, 관계, 첫 상황을 자유롭게 적어 주세요.\n예: 오랜만에 연락이 끊겼던 선배. 술이 한 잔 들어가자 묘하게 시선이 길어진다.'}
              />
            </label>
            <button type="submit" className="primary" disabled={!creatorName.trim() || !creatorIntro.trim()}>
              캐릭터 만들기
            </button>
          </form>
        </section>
      )}

      {tab === 'my' && (
        <section className="my-page">
          <h1>설정</h1>

          <div className="panel">
            <header>
              <h2>계정</h2>
              <p>구글 계정으로 로그인하면 닉네임과 프로필 사진이 자동으로 반영돼요.</p>
            </header>
            {googleProfile ? (
              <div className="account-row">
                {googleProfile.picture && (
                  <img src={googleProfile.picture} alt="" className="avatar" referrerPolicy="no-referrer" />
                )}
                <div>
                  <strong>{googleProfile.name || '이름 없음'}</strong>
                  <span>{googleProfile.email}</span>
                </div>
                <button type="button" className="ghost-small" onClick={signOut}>
                  <Icon name="logout" size={14} />
                  로그아웃
                </button>
              </div>
            ) : googleClientId ? (
              <>
                <div ref={googleButtonRef} className="google-button-slot" />
                {googleError && <p className="helper-error">{googleError}</p>}
              </>
            ) : (
              <div className="notice">
                <p>
                  구글 로그인을 쓰려면 Google Cloud Console에서 <strong>OAuth 2.0 Client ID</strong>를 무료로 발급받아 아래에 넣어
                  주세요. 배포 도메인을 Authorized JavaScript origins에 추가해야 작동합니다.
                </p>
                <label>
                  Google Client ID
                  <input
                    value={googleClientId}
                    onChange={(event) => setGoogleClientId(event.target.value)}
                    onBlur={(event) => applyGoogleClientId(event.target.value)}
                    placeholder="xxxxxxxx.apps.googleusercontent.com"
                    autoComplete="off"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="panel">
            <header>
              <h2>닉네임</h2>
              <p>AI가 이 이름으로 당신을 부릅니다.</p>
            </header>
            <label>
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="예: 민준"
              />
            </label>
          </div>

          <div className="panel">
            <header>
              <h2>Gemini 연결</h2>
              <p>
                Google AI Studio의 <strong>무료 API 키</strong>를 사용합니다. 키는 내 브라우저에만 저장돼요.
              </p>
            </header>
            <p className={`model-status ${modelState}`}>
              <span className="dot" /> {modelMessage}
            </p>
            <label>
              Gemini API 키
              <input
                type="password"
                value={geminiApiKey}
                onChange={(event) => setGeminiApiKey(event.target.value)}
                placeholder="AIza..."
                autoComplete="off"
              />
            </label>
            <label>
              모델 이름
              <input
                value={geminiModel}
                onChange={(event) => setGeminiModel(event.target.value)}
                placeholder={DEFAULT_GEMINI_MODEL}
              />
            </label>
            <div className="panel-actions">
              <button type="button" className="ghost" onClick={checkModel}>
                상태 확인
              </button>
              <button type="button" className="primary" onClick={testModelResponse}>
                짧은 답변 테스트
              </button>
            </div>
          </div>
        </section>
      )}

      {detailCharacter && (
        <section className="sheet detail-sheet" aria-label="캐릭터 상세">
          <button className="sheet-backdrop" type="button" onClick={() => setDetailCharacter(null)} aria-label="닫기" />
          <div className="sheet-body detail-card">
            <button
              type="button"
              className="sheet-close icon-btn"
              onClick={() => setDetailCharacter(null)}
              aria-label="닫기"
            >
              <Icon name="x" />
            </button>
            <div className="detail-hero">
              <button
                type="button"
                className="detail-hero-photo"
                onClick={() =>
                  setPhotoPreview({ image: detailCharacter.image, label: detailCharacter.title })
                }
                aria-label={`${detailCharacter.title} 크게 보기`}
              >
                <img src={assetPath(detailCharacter.image)} alt="" />
              </button>
              <div>
                <span className="detail-genre">{detailCharacter.genre}</span>
                <h1>{detailCharacter.title}</h1>
                <p>{personalize(detailCharacter.subtitle, nickname)}</p>
              </div>
            </div>
            <div className="detail-body">
              <div className="tag-line">
                {detailCharacter.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
              <p className="detail-intro">{personalize(detailCharacter.intro, nickname)}</p>
              <dl className="detail-grid">
                <div>
                  <dt>직업</dt>
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
              </dl>
              {detailCharacter.gallery.length > 1 && (
                <div className="photo-gallery" aria-label="추가 사진">
                  {detailCharacter.gallery.map((photo) => (
                    <button
                      key={`${photo.row}-${photo.col}-${photo.label}`}
                      type="button"
                      className="gallery-thumb"
                      onClick={() => setPhotoPreview(photo)}
                      aria-label={`${photo.label} 크게 보기`}
                      style={{
                        backgroundImage: `url(${assetPath(photo.image)})`,
                        backgroundPosition: galleryPosition(photo),
                      }}
                    >
                      <span>{photo.label}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="sheet-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => toggleFavorite(detailCharacter.id)}
                >
                  <Icon
                    name={favorites.includes(detailCharacter.id) ? 'heartFilled' : 'heart'}
                    size={16}
                  />
                  {favorites.includes(detailCharacter.id) ? '즐겨찾기 해제' : '즐겨찾기'}
                </button>
                <button type="button" className="primary" onClick={() => openChat(detailCharacter)}>
                  대화 시작
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {photoPreview && (
        <section className="photo-viewer" aria-label="사진 크게 보기">
          <button className="sheet-backdrop" type="button" onClick={() => setPhotoPreview(null)} aria-label="닫기" />
          <div className="photo-viewer-content">
            <button
              type="button"
              className="photo-viewer-close icon-btn"
              onClick={() => setPhotoPreview(null)}
              aria-label="닫기"
            >
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
              />
            )}
            <strong>{photoPreview.label}</strong>
          </div>
        </section>
      )}

      <nav className="bottom-nav" aria-label="하단 메뉴">
        <button className={tab === 'home' ? 'active' : ''} type="button" onClick={() => setTab('home')}>
          <Icon name="home" />
          <span>홈</span>
        </button>
        <button className={tab === 'chats' ? 'active' : ''} type="button" onClick={() => setTab('chats')}>
          <Icon name="chat" />
          <span>대화</span>
        </button>
        <button className={tab === 'create' ? 'active' : ''} type="button" onClick={() => setTab('create')}>
          <Icon name="plus" />
          <span>만들기</span>
        </button>
        <button className={tab === 'my' ? 'active' : ''} type="button" onClick={() => setTab('my')}>
          <Icon name="settings" />
          <span>설정</span>
        </button>
      </nav>
    </main>
  )
}

export default App
