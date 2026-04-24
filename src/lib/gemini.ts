import type { ChatMessage } from '../types'

const ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

function endpoint(model: string) {
  return `${ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent`
}

function geminiContents(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.sender !== 'system')
    .map((message) => ({
      role: message.sender === 'assistant' ? 'model' : 'user',
      parts: [
        {
          text:
            message.sender === 'cast'
              ? `[${message.speakerName}의 발화]\n${message.text}`
              : message.text,
        },
      ],
    }))
}

type GeminiCandidate = {
  content?: {
    parts?: Array<{ text?: string; thought?: boolean }>
  }
}

type GeminiResponse = { candidates?: GeminiCandidate[] }

function extractText(data: GeminiResponse) {
  return (
    data.candidates?.[0]?.content?.parts
      ?.filter((part) => !part.thought)
      .map((part) => part.text || '')
      .join('')
      .trim() || ''
  )
}

export type GeminiOptions = {
  apiKey: string
  model: string
  systemInstruction?: string
  messages: ChatMessage[]
  prompt?: string
  temperature?: number
  topP?: number
  signal?: AbortSignal
}

export async function callGemini({
  apiKey,
  model,
  systemInstruction,
  messages,
  prompt,
  temperature = 0.84,
  topP = 0.92,
  signal,
}: GeminiOptions) {
  if (!apiKey.trim()) throw new Error('Gemini API 키가 없습니다.')

  const contents = prompt
    ? [{ role: 'user', parts: [{ text: prompt }] }]
    : geminiContents(messages)

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature, topP },
  }
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const response = await fetch(endpoint(model), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey.trim(),
    },
    signal,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Gemini 응답 오류 ${response.status}`)
  }

  const data = (await response.json()) as GeminiResponse
  return extractText(data)
}
