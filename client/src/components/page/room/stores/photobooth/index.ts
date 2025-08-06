import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

// Slice types import
export { PhotoBoothState } from './stateSlice'
export type { StateSlice } from './stateSlice'
export type { FrameSlice } from './frameSlice'
export type { CutSlice } from './cutSlice'
export type { PhotoSlice } from './photoSlice'

// Slice creators export
export { createStateSlice } from './stateSlice'
export { createFrameSlice } from './frameSlice'
export { createCutSlice } from './cutSlice'
export { createPhotoSlice } from './photoSlice'

// Combined PhotoBooth slice type
export type PhotoBoothSlice = 
  import('./stateSlice').StateSlice & 
  import('./frameSlice').FrameSlice & 
  import('./cutSlice').CutSlice & 
  import('./photoSlice').PhotoSlice &
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

export const getFrameMap = (roomName: string) => {
  const room = getOrCreateRoom(roomName)
  return room.ydoc.getMap('frameState')
}

export const getCutMap = (roomName: string) => {
  const room = getOrCreateRoom(roomName)
  return room.ydoc.getMap('cutState')
}

export const getPhotoMap = (roomName: string) => {
  const room = getOrCreateRoom(roomName)
  return room.ydoc.getMap('photoState')
}

// 하위 호환성을 위한 legacy 함수
export const getPhotoBoothMap = (roomName: string) => {
  return getStateMap(roomName)
}

// PhotoBooth 상태 초기화 (방장 관리 제거, 촬영 설정만 관리)
export const initializePhotoBoothState = (
  roomName: string,
  onUpdate: (data: any) => void
) => {
  const photoBoothMap = getPhotoBoothMap(roomName)
  
  console.log('🎯 Initializing PhotoBooth state for room:', roomName)
  
  // 변경사항 감지 리스너 설정
  const updateHandler = () => {
    const data = {
      photoBoothState: photoBoothMap.get('photoBoothState'),
      frameColor: photoBoothMap.get('frameColor'),
      cutCount: photoBoothMap.get('cutCount'),
      currentCutIndex: photoBoothMap.get('currentCutIndex'),
      selectedPhotos: photoBoothMap.get('selectedPhotos') || [],
    }
    console.log('🔄 PhotoBooth state updated:', data)
    onUpdate(data)
  }
  
  photoBoothMap.observe(updateHandler)
  
  // 초기 상태 전송
  updateHandler()
  
  return () => {
    photoBoothMap.unobserve(updateHandler)
  }
}

// Slice별 상태 업데이트 함수들

// State slice 업데이트
export const updatePhotoBoothState = (roomName: string, state: string) => {
  const stateMap = getStateMap(roomName)
  stateMap.set('photoBoothState', state)
  console.log('🔄 PhotoBooth state set to:', state)
}

// Frame slice 업데이트
export const updateFrameColor = (roomName: string, color: string) => {
  const frameMap = getFrameMap(roomName)
  frameMap.set('frameColor', color)
  console.log('🔄 Frame color set to:', color)
}

// Cut slice 업데이트
export const updateCutCount = (roomName: string, count: number) => {
  const cutMap = getCutMap(roomName)
  cutMap.set('cutCount', count)
  console.log('🔄 Cut count set to:', count)
}

export const updateCurrentCutIndex = (roomName: string, index: number) => {
  const cutMap = getCutMap(roomName)
  cutMap.set('currentCutIndex', index)
  console.log('🔄 Current cut index set to:', index)
}

// Photo slice 업데이트
export const updateSelectedPhotos = (roomName: string, photos: string[]) => {
  const photoMap = getPhotoMap(roomName)
  photoMap.set('selectedPhotos', photos)
  console.log('🔄 Selected photos updated:', photos)
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
