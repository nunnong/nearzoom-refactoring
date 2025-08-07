import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

// Slice types import
export { PhotoBoothState } from './stateSlice'
export type { StateSlice } from './stateSlice'
export type { CutSlice } from './cutSlice'
export type { SelectSlice } from './selectSlice'
export type { ShootingSlice } from './shootingSlice'
export type { PhotoCanvasSlice } from './photoCanvasSlice'

// Legacy types removed - now using selectSlice

// Slice creators export
export { createStateSlice } from './stateSlice'
export { createCutSlice } from './cutSlice'
export { createSelectSlice } from './selectSlice'
export { createShootingSlice } from './shootingSlice'
export { createPhotoCanvasSlice } from './photoCanvasSlice'

// Legacy creators removed - now using selectSlice

// Combined PhotoBooth slice type
export type PhotoBoothSlice = 
  import('./stateSlice').StateSlice & 
  import('./cutSlice').CutSlice & 
  import('./selectSlice').SelectSlice &
  import('./shootingSlice').ShootingSlice &
  import('./photoCanvasSlice').PhotoCanvasSlice &
  import('../roomLeaderSlice').RoomLeaderSlice

// Room별 WebSocket Provider와 Doc을 관리하는 Map
const roomProviders = new Map<
  string,
  {
    ydoc: Y.Doc
    wsProvider: WebsocketProvider
    awareness: any
  }
>()

// Room별 Yjs 인스턴스 생성 또는 가져오기
export const getOrCreateRoom = (roomName: string) => {
  if (!roomProviders.has(roomName)) {
    // 새로운 room을 위한 Yjs 문서 생성
    const ydoc = new Y.Doc()

    // Room별 WebSocket 연결 생성
    const wsProvider = new WebsocketProvider(
      'wss://api.nearzoom.store/ws',
      `room-${roomName}`, // room별 고유 식별자
      ydoc
    )

    const awareness = wsProvider.awareness

    // 연결 상태 모니터링
    wsProvider.on('status', (event: { status: string }) => {
      console.log(`Room ${roomName} WebSocket 상태:`, event.status)
    })

    wsProvider.on('sync', (isSynced: boolean) => {
      console.log(`Room ${roomName} 동기화 상태:`, isSynced)
    })

    roomProviders.set(roomName, {
      ydoc,
      wsProvider,
      awareness,
    })
  }

  return roomProviders.get(roomName)!
}

// Slice별 Yjs Map 생성 및 관리
export const getStateMap = (roomName: string) => {
  const room = getOrCreateRoom(roomName)
  return room.ydoc.getMap('photoBoothState')
}

export const getCutMap = (roomName: string) => {
  const room = getOrCreateRoom(roomName)
  return room.ydoc.getMap('cutState')
}

export const getSelectMap = (roomName: string) => {
  const room = getOrCreateRoom(roomName)
  return room.ydoc.getMap('selectState')
}

// Legacy maps for backward compatibility
export const getFrameMap = (roomName: string) => {
  const room = getOrCreateRoom(roomName)
  return room.ydoc.getMap('frameState')
}

export const getPhotoMap = (roomName: string) => {
  const room = getOrCreateRoom(roomName)
  return room.ydoc.getMap('photoState')
}

export const getShootingMap = (roomName: string) => {
  const room = getOrCreateRoom(roomName)
  return room.ydoc.getMap('shootingState')
}

export const getPhotoCanvasMap = (roomName: string) => {
  const room = getOrCreateRoom(roomName)
  return room.ydoc.getMap('photoCanvasState')
}


// 하위 호환성을 위한 legacy 함수
export const getPhotoBoothMap = (roomName: string) => {
  return getStateMap(roomName)
}

// PhotoBooth 상태 초기화 (모든 slice 상태 포함)
export const initializePhotoBoothState = (
  roomName: string,
  onUpdate: (data: any) => void
) => {
  const photoBoothMap = getPhotoBoothMap(roomName)
  const shootingMap = getShootingMap(roomName)
  const selectMap = getSelectMap(roomName)
  const photoCanvasMap = getPhotoCanvasMap(roomName)
  
  console.log('🎯 Initializing PhotoBooth state for room:', roomName)
  
  // 기본 PhotoBooth 상태 변경사항 감지 리스너
  const photoBoothUpdateHandler = () => {
    const data = {
      photoBoothState: photoBoothMap.get('photoBoothState'),
      cutCount: photoBoothMap.get('cutCount'),
      currentCutIndex: photoBoothMap.get('currentCutIndex'),
    }
    console.log('🔄 PhotoBooth state updated:', data)
    onUpdate(data)
  }
  
  // Select 상태 변경사항 감지 리스너 (새로 추가)
  const selectUpdateHandler = () => {
    const data = {
      selectedPhotos: selectMap.get('selectedPhotos') || [],
      frameColor: selectMap.get('frameColor') || '#FFFFFF',
    }
    console.log('🔄 Select state updated:', data)
    onUpdate(data)
  }
  
  // Shooting 상태 변경사항 감지 리스너
  const shootingUpdateHandler = () => {
    const data = {
      isShooting: shootingMap.get('isShooting'),
      shootingTimer: shootingMap.get('shootingTimer'),
      isFlashing: shootingMap.get('isFlashing'),
      isCapturing: shootingMap.get('isCapturing'),
      isSaving: shootingMap.get('isSaving'),
      capturedImages: shootingMap.get('capturedImages') || [],
      currentShootingCut: shootingMap.get('currentShootingCut'),
    }
    console.log('🔄 Shooting state updated:', data)
    onUpdate(data)
  }
  
  // PhotoCanvas 상태 변경사항 감지 리스너
  const photoCanvasUpdateHandler = () => {
    const data = {
      participants: photoCanvasMap.get('participants') || {},
      selectedParticipant: photoCanvasMap.get('selectedParticipant'),
    }
    console.log('🔄 PhotoCanvas state updated:', data)
    onUpdate(data)
  }
  
  
  // 리스너 등록
  photoBoothMap.observe(photoBoothUpdateHandler)
  selectMap.observe(selectUpdateHandler)
  shootingMap.observe(shootingUpdateHandler)
  photoCanvasMap.observe(photoCanvasUpdateHandler)
  
  // 초기 상태 전송
  photoBoothUpdateHandler()
  selectUpdateHandler()
  shootingUpdateHandler()
  photoCanvasUpdateHandler()
  
  return () => {
    photoBoothMap.unobserve(photoBoothUpdateHandler)
    selectMap.unobserve(selectUpdateHandler)
    shootingMap.unobserve(shootingUpdateHandler)
    photoCanvasMap.unobserve(photoCanvasUpdateHandler)
  }
}

// Slice별 상태 업데이트 함수들

// State slice 업데이트
export const updatePhotoBoothState = (roomName: string, state: string) => {
  const stateMap = getStateMap(roomName)
  stateMap.set('photoBoothState', state)
  console.log('🔄 PhotoBooth state set to:', state)
}

// Frame slice 업데이트는 이제 selectSlice로 통합됨

// Cut slice 업데이트 (photoBoothMap으로 통합)
export const updateCutCount = (roomName: string, count: number) => {
  const photoBoothMap = getPhotoBoothMap(roomName)
  photoBoothMap.set('cutCount', count)
  console.log('🔄 Cut count set to:', count)
}

export const updateCurrentCutIndex = (roomName: string, index: number) => {
  const photoBoothMap = getPhotoBoothMap(roomName)
  photoBoothMap.set('currentCutIndex', index)
  console.log('🔄 Current cut index set to:', index)
}

// Select slice 업데이트 (새로운 통합 함수)
export const updateSelectState = (roomName: string, updates: Partial<{
  selectedPhotos: string[]
  frameColor: string
}>) => {
  const selectMap = getSelectMap(roomName)
  
  Object.entries(updates).forEach(([key, value]) => {
    selectMap.set(key, value)
    console.log(`🔄 Select state updated - ${key}:`, value)
  })
}

// Legacy functions for backward compatibility
export const updateSelectedPhotos = (roomName: string, photos: string[]) => {
  updateSelectState(roomName, { selectedPhotos: photos })
}

export const updateFrameColor = (roomName: string, color: string) => {
  updateSelectState(roomName, { frameColor: color })
}

// Shooting slice 업데이트
export const updateShootingState = (roomName: string, state: Partial<{
  isShooting: boolean
  shootingTimer: number
  isFlashing: boolean
  isCapturing: boolean
  isSaving: boolean
  currentShootingCut: number
}>) => {
  const shootingMap = getShootingMap(roomName)
  
  if (state.isShooting !== undefined) {
    shootingMap.set('isShooting', state.isShooting)
    console.log('🔄 isShooting set to:', state.isShooting)
  }
  
  if (state.shootingTimer !== undefined) {
    shootingMap.set('shootingTimer', state.shootingTimer)
    console.log('🔄 shootingTimer set to:', state.shootingTimer)
  }
  
  if (state.isFlashing !== undefined) {
    shootingMap.set('isFlashing', state.isFlashing)
    console.log('🔄 isFlashing set to:', state.isFlashing)
  }
  
  if (state.isCapturing !== undefined) {
    shootingMap.set('isCapturing', state.isCapturing)
    console.log('🔄 isCapturing set to:', state.isCapturing)
  }
  
  if (state.isSaving !== undefined) {
    shootingMap.set('isSaving', state.isSaving)
    console.log('🔄 isSaving set to:', state.isSaving)
  }
  
  if (state.currentShootingCut !== undefined) {
    shootingMap.set('currentShootingCut', state.currentShootingCut)
    console.log('🔄 currentShootingCut set to:', state.currentShootingCut)
  }
}

export const updateShootingTimer = (roomName: string, seconds: number) => {
  const shootingMap = getShootingMap(roomName)
  shootingMap.set('shootingTimer', seconds)
  console.log('🔄 Shooting timer set to:', seconds)
}

export const updateCapturedImages = (roomName: string, images: string[]) => {
  const shootingMap = getShootingMap(roomName)
  shootingMap.set('capturedImages', images)
  console.log('🔄 Captured images updated, count:', images.length)
}

// PhotoCanvas slice 업데이트
export const updatePhotoCanvasState = (roomName: string, state: Partial<{
  participants: Record<string, any>
  selectedParticipant: string | null
}>) => {
  const photoCanvasMap = getPhotoCanvasMap(roomName)
  
  if (state.participants !== undefined) {
    photoCanvasMap.set('participants', state.participants)
    console.log('🔄 PhotoCanvas participants updated')
  }
  
  if (state.selectedParticipant !== undefined) {
    photoCanvasMap.set('selectedParticipant', state.selectedParticipant)
    console.log('🔄 Selected participant:', state.selectedParticipant)
  }
}


// Room 연결 해제
export const disconnectRoom = (roomName: string) => {
  const room = roomProviders.get(roomName)
  if (room) {
    room.wsProvider.destroy()
    room.ydoc.destroy()
    roomProviders.delete(roomName)
  }
}
