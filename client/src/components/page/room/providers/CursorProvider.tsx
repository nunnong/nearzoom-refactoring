'use client'

import {
  type ReactNode,
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import { useStore } from 'zustand'
import { RoomContext } from '@livekit/components-react'
import { RoomEvent, DataPacket_Kind } from 'livekit-client'
import {
  createCursorStore,
  type CursorStore,
  type CursorPosition,
  type CursorDataPacket,
  generateUserColor,
} from '../stores/cursorStore'
import { useAuthStore } from '@/stores/authStore'

export type CursorStoreApi = ReturnType<typeof createCursorStore>

// 실시간 로컬 커서 컨텍스트
export const RealtimeLocalCursorContext = createContext<
  | {
      localCursor: CursorPosition | null
      setLocalCursor: (cursor: CursorPosition | null) => void
      isActive: boolean
      setIsActive: (active: boolean) => void
    }
  | undefined
>(undefined)

export const CursorStoreContext = createContext<CursorStoreApi | undefined>(
  undefined
)

export interface CursorProviderProps {
  children: ReactNode
  containerRef?: React.RefObject<HTMLElement | null>
}

export const CursorProvider = ({
  children,
  containerRef,
}: CursorProviderProps) => {
  const room = useContext(RoomContext)
  const user = useAuthStore(state => state.user)
  const username = user?.name

  // 통합된 커서 상태 (로컬/원격 구분 없이)
  const [localCursor, setLocalCursor] = useState<CursorPosition | null>(null)
  const [isLocalCursorActive, setIsLocalCursorActive] = useState(false)

  // 사용자 정보 refs
  const throttleRef = useRef<NodeJS.Timeout>()
  const userIdRef = useRef<string>()
  const userColorRef = useRef<string>()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  // Cursor store를 한 번만 생성 (원격 커서용)
  const [store] = useState(() => {
    console.log('🎯 Creating unified CursorStore')
    return createCursorStore()
  })

  // Store 액션들 추출
  const { setCursor, removeCursor, clearAllCursors, markCursorForRemoval } =
    store.getState()

  // 사용자 정보 초기화 (participant.identity 기준)
  useEffect(() => {
    if (username && room?.localParticipant) {
      userIdRef.current = room.localParticipant.identity || username
      userColorRef.current = generateUserColor(userIdRef.current)
      // console.log('🎯 User ID initialized:', userIdRef.current)
    }
  }, [username, room?.localParticipant])

  // LiveKit Data Packet 수신 처리
  useEffect(() => {
    if (!room) return
    
    // console.log('🎯 Setting up LiveKit cursor data listener')
    
    const handleDataReceived = (
      payload: Uint8Array, 
      participant: any, 
      kind?: DataPacket_Kind, 
      topic?: string
    ) => {
      if (topic !== 'cursor') return
      
      try {
        const dataString = decoder.decode(payload)
        const cursorData: CursorDataPacket = JSON.parse(dataString)
        
        // console.log('📨 Received cursor data:', {
        //   from: participant?.identity,
        //   type: cursorData.type,
        //   position: cursorData.x !== undefined ? `${cursorData.x},${cursorData.y}` : 'hidden'
        // })
        
        // 자신의 데이터는 무시
        if (cursorData.userId === userIdRef.current) return
        
        if (cursorData.type === 'cursor_update' && cursorData.x !== undefined && cursorData.y !== undefined) {
          const remoteCursor: CursorPosition = {
            x: cursorData.x,
            y: cursorData.y,
            userId: cursorData.userId,
            userName: cursorData.userName,
            color: cursorData.color,
            timestamp: cursorData.timestamp
          }
          
          setCursor(cursorData.userId, remoteCursor)
        } else if (cursorData.type === 'cursor_hide') {
          setCursor(cursorData.userId, null)
        }
      } catch (error) {
        console.error('Failed to parse cursor data:', error)
      }
    }
    
    room.on(RoomEvent.DataReceived, handleDataReceived)
    
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived)
    }
  }, [room, setCursor, decoder])

  // 커서 위치 업데이트 함수
  const updateCursorPosition = useCallback((x: number, y: number) => {
    if (!room || !userIdRef.current || !userColorRef.current || !username) {
      return
    }
    
    // 1. 즉시 로컬 커서 업데이트
    const localCursorData: CursorPosition = {
      x,
      y,
      userId: userIdRef.current,
      userName: username,
      color: userColorRef.current,
      timestamp: Date.now()
    }
    
    setLocalCursor(localCursorData)
    
    // 2. DataChannel 전송 (throttled)
    if (throttleRef.current) {
      clearTimeout(throttleRef.current)
    }
    
    throttleRef.current = setTimeout(() => {
      const cursorPacket: CursorDataPacket = {
        type: 'cursor_update',
        userId: userIdRef.current!,
        userName: username,
        color: userColorRef.current!,
        x,
        y,
        timestamp: Date.now()
      }
      
      const data = encoder.encode(JSON.stringify(cursorPacket))
      
      // Room이 연결되어 있고 localParticipant가 있는지 확인
      if (!room?.localParticipant || room.state !== 'connected') {
        // Room이 준비되지 않았으면 조용히 스킵
        return
      }
      
      room.localParticipant.publishData(data, {
        reliable: false,
        topic: 'cursor'
      }).catch(error => {
        // PC manager closed 오류는 무시 (정상적인 연결 해제 과정)
        if (!error.message?.includes('PC manager is closed')) {
          console.error('Failed to publish cursor data:', error)
        }
      })
      
      // console.log('📡 Published cursor update:', { x, y, topic: 'cursor' })
    }, 32) // ~60fps
  }, [room, username, encoder])

  // 커서 숨기기 함수
  const hideCursor = useCallback(() => {
    if (!room || !userIdRef.current || !username) return
    
    setLocalCursor(null)
    
    const cursorPacket: CursorDataPacket = {
      type: 'cursor_hide',
      userId: userIdRef.current,
      userName: username,
      color: userColorRef.current!,
      timestamp: Date.now()
    }
    
    const data = encoder.encode(JSON.stringify(cursorPacket))
    
    // Room이 연결되어 있고 localParticipant가 있는지 확인
    if (!room?.localParticipant || room.state !== 'connected') {
      // Room이 준비되지 않았으면 조용히 스킵
      return
    }
    
    room.localParticipant.publishData(data, {
      reliable: false,
      topic: 'cursor'
    }).catch(error => {
      // PC manager closed 오류는 무시 (정상적인 연결 해제 과정)
      if (!error.message?.includes('PC manager is closed')) {
        console.error('Failed to publish cursor hide:', error)
      }
    })
    
    // console.log('🫥 Published cursor hide')
  }, [room, username, encoder])

  // 마우스 이벤트 핸들러
  useEffect(() => {
    const container = containerRef?.current || document

    const handleMouseMove = (e: Event) => {
      const mouseEvent = e as MouseEvent
      const targetElement = containerRef?.current || document.documentElement
      const rect = targetElement.getBoundingClientRect()

      const x = mouseEvent.clientX - rect.left
      const y = mouseEvent.clientY - rect.top

      // 컨테이너 영역 내에서만 커서 업데이트
      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
        updateCursorPosition(x, y)
        setIsLocalCursorActive(true)
      } else {
        setIsLocalCursorActive(false)
      }
    }

    const handleMouseEnter = () => {
      setIsLocalCursorActive(true)
    }

    const handleMouseLeave = () => {
      setIsLocalCursorActive(false)
      hideCursor()
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseenter', handleMouseEnter)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseenter', handleMouseEnter)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [containerRef, updateCursorPosition, hideCursor])

  // 참가자 연결 해제 감지 및 통합 커서 정리
  useEffect(() => {
    if (!room) return
    
    console.log('🔌 Setting up unified cursor cleanup system')
    
    const handleParticipantDisconnected = (participant: any) => {
      console.log('👋 Participant disconnected:', participant.identity)
      
      // participant.identity와 매칭되는 모든 커서 찾아서 제거
      const currentState = store.getState()
      const cursors = currentState.cursors
      
      let removedCount = 0
      cursors.forEach((cursor, userId) => {
        if (cursor.userName === participant.identity || userId === participant.identity) {
          console.log('🗑️ Removing cursor for disconnected participant:', {
            userId,
            userName: cursor.userName,
            participantIdentity: participant.identity
          })
          
          markCursorForRemoval(userId)
          setTimeout(() => {
            removeCursor(userId)
          }, 300)
          removedCount++
        }
      })
      
      console.log(`✅ Removed ${removedCount} cursors for disconnected participant`)
    }
    
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    
    // 주기적 정리 (10초마다, 백업용) - participant.identity 기준으로 단순화
    const cleanupInterval = setInterval(() => {
      const currentState = store.getState()
      const cursors = currentState.cursors
      const activeParticipantIdentities = new Set([
        room.localParticipant.identity,
        ...Array.from(room.remoteParticipants.keys()),
      ])

      console.log('🧹 Periodic cleanup check:', {
        activeCursors: cursors.size,
        activeParticipants: activeParticipantIdentities.size,
        participants: Array.from(activeParticipantIdentities),
      })

      let removedCount = 0
      cursors.forEach((cursor, userId) => {
        // participant.identity와 직접 매칭 (단순화)
        const isUserActive = activeParticipantIdentities.has(cursor.userName) || 
                           activeParticipantIdentities.has(userId)

        if (!isUserActive) {
          console.log('🗑️ Periodic cleanup - removing inactive cursor:', {
            userId,
            userName: cursor.userName,
            activeParticipants: Array.from(activeParticipantIdentities)
          })

          markCursorForRemoval(userId)
          setTimeout(() => {
            removeCursor(userId)
          }, 300)

          removedCount++
        }
      })

      if (removedCount > 0) {
        console.log(`✅ Periodic cleanup removed ${removedCount} inactive cursors`)
      }
    }, 10000)

    return () => {
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
      clearInterval(cleanupInterval)
    }
  }, [room, store, removeCursor, markCursorForRemoval])

  return (
    <RealtimeLocalCursorContext.Provider
      value={{
        localCursor: localCursor,
        setLocalCursor: setLocalCursor,
        isActive: isLocalCursorActive,
        setIsActive: setIsLocalCursorActive,
      }}
    >
      <CursorStoreContext.Provider value={store}>
        {children}
      </CursorStoreContext.Provider>
    </RealtimeLocalCursorContext.Provider>
  )
}

// Cursor store 사용을 위한 훅 (원격 커서용)
export const useCursorStore = <T,>(selector: (store: CursorStore) => T): T => {
  const cursorStoreContext = useContext(CursorStoreContext)

  if (!cursorStoreContext) {
    throw new Error('useCursorStore must be used within CursorProvider')
  }

  return useStore(cursorStoreContext, selector)
}

// 실시간 로컬 커서 사용을 위한 훅
export const useRealtimeLocalCursor = () => {
  const realtimeContext = useContext(RealtimeLocalCursorContext)

  if (!realtimeContext) {
    throw new Error('useRealtimeLocalCursor must be used within CursorProvider')
  }

  return realtimeContext
}
