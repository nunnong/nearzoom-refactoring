'use client'

import { 
  type ReactNode, 
  createContext, 
  useContext, 
  useState, 
  useEffect,
  useRef
} from 'react'
import { useStore } from 'zustand'
import { RoomContext } from '@livekit/components-react'
import { createCursorStore, type CursorStore } from '../stores/cursorStore'
import { useLiveKitCursor } from '../hooks/useLiveKitCursor'

export type CursorStoreApi = ReturnType<typeof createCursorStore>

export const CursorStoreContext = createContext<CursorStoreApi | undefined>(undefined)

export interface CursorProviderProps {
  children: ReactNode
  containerRef?: React.RefObject<HTMLElement | null>
}

export const CursorProvider = ({ 
  children, 
  containerRef 
}: CursorProviderProps) => {
  const room = useContext(RoomContext)
  
  // Cursor store를 한 번만 생성
  const [store] = useState(() => {
    console.log('🎯 Creating LiveKit-based CursorStore')
    return createCursorStore()
  })
  
  // Store 액션들 추출
  const { setCursor, setLocalCursor, setActive, removeCursor, clearAllCursors, markCursorForRemoval } = store.getState()
  
  // LiveKit cursor 동기화 훅
  const { updateCursorPosition, hideCursor, isConnected } = useLiveKitCursor({
    setCursor,
    setLocalCursor,
    setActive,
    removeCursor,
    markCursorForRemoval,
    throttleMs: 50
  })
  
  // 마우스 이벤트 핸들러
  useEffect(() => {
    const container = containerRef?.current || document
    
    const handleMouseMove = (e: MouseEvent) => {
      const targetElement = containerRef?.current || document.documentElement
      const rect = targetElement.getBoundingClientRect()
      
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // 컨테이너 영역 내에서만 커서 업데이트
      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
        updateCursorPosition(x, y)
        setActive(true)
      } else {
        setActive(false)
      }
    }
    
    const handleMouseEnter = () => {
      setActive(true)
    }
    
    const handleMouseLeave = () => {
      setActive(false)
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
  }, [containerRef, updateCursorPosition, hideCursor, setActive])
  
  // 연결 상태 로깅
  useEffect(() => {
    console.log('🌐 CursorProvider LiveKit connection status:', isConnected)
  }, [isConnected])
  
  // 주기적으로 활성 참가자와 커서 동기화
  useEffect(() => {
    if (!room) return
    
    const cleanupInterval = setInterval(() => {
      const currentState = store.getState()
      const cursors = currentState.cursors
      const activeParticipants = new Set([
        room.localParticipant.identity,
        ...Array.from(room.participants.keys())
      ])
      
      console.log('🧹 Periodic cursor cleanup check:', {
        activeCursors: cursors.size,
        activeParticipants: activeParticipants.size,
        participantList: Array.from(activeParticipants)
      })
      
      // 비활성 사용자의 커서 제거 (부드러운 애니메이션과 함께)
      let removedCount = 0
      cursors.forEach((cursor, userId) => {
        // userId는 "username-timestamp" 형태이므로 username 부분만 추출
        const username = cursor.userName
        
        // 해당 username을 가진 참가자가 더 이상 활성화되어 있지 않으면 제거
        const isUserActive = Array.from(activeParticipants).some(identity => 
          identity === username || identity.startsWith(username)
        )
        
        if (!isUserActive) {
          console.log('🗑️ Removing inactive cursor with animation:', { userId, username })
          
          // 먼저 제거 애니메이션 시작
          markCursorForRemoval(userId)
          
          // 300ms 후에 실제로 제거 (애니메이션 완료 후)
          setTimeout(() => {
            removeCursor(userId)
          }, 300)
          
          removedCount++
        }
      })
      
      if (removedCount > 0) {
        console.log(`✅ Removed ${removedCount} inactive cursors`)
      }
    }, 10000) // 10초마다 체크
    
    return () => {
      clearInterval(cleanupInterval)
    }
  }, [room, store, removeCursor])
  
  return (
    <CursorStoreContext.Provider value={store}>
      {children}
    </CursorStoreContext.Provider>
  )
}

// Cursor store 사용을 위한 훅
export const useCursorStore = <T,>(
  selector: (store: CursorStore) => T
): T => {
  const cursorStoreContext = useContext(CursorStoreContext)
  
  if (!cursorStoreContext) {
    throw new Error('useCursorStore must be used within CursorProvider')
  }
  
  return useStore(cursorStoreContext, selector)
}