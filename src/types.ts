export type Sender = 'user' | 'assistant' | 'system' | 'cast'

export type ChatMessage = {
  id: string
  sender: Sender
  text: string
  time: string
  speakerName?: string
  speakerImage?: string
}

export type CastMember = {
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

export type ChatSession = {
  id: string
  characterId: number
  title: string
  messages: ChatMessage[]
  castMembers: CastMember[]
  createdAt: number
  updatedAt: number
}

export type CharacterPhoto = {
  image: string
  row: number
  col: number
  label: string
}

export type Character = {
  id: number
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

export type ModelState = 'unknown' | 'checking' | 'ready' | 'missing' | 'error'

export type Tab = 'home' | 'chats' | 'create' | 'my'
