import { TrackReference } from '@livekit/components-core'

export interface ParticipantTransform {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
  lastInteractionTime: number // 마지막 상호작용 시간 (z-index 관리용)
}

export interface PhotoCanvasState {
  participants: Record<string, ParticipantTransform>
  selectedParticipant: string | null
}

export interface ParticipantVideoProps {
  trackReference: TrackReference
  roomName: string // 추가: Yjs 업데이트를 위한 roomName
  index: number
  isSelected: boolean
  onSelect: (id: string) => void
  transform: ParticipantTransform
  participants: Record<string, ParticipantTransform> // 추가: 전체 participants 정보
}

export interface ChromaKeyConfig {
  enabled: boolean
  color: string
  threshold: number
  smoothing: number
}

export const CANVAS_CONFIG = {
  width: 512,
  height: 512,
  backgroundColor: '#f0f0f0',
} as const

export const DEFAULT_PARTICIPANT_CONFIG = {
  width: 320,
  height: 240,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
} as const

export const CHROMAKEY_CONFIG: ChromaKeyConfig = {
  enabled: true,
  color: '#00ff00',
  threshold: 40,
  smoothing: 1,
} as const