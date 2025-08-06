import { useCallback, useEffect, useRef } from 'react'
import { useContext } from 'react'
import { RoomContext } from '@livekit/components-react'
import { RoomEvent, DataPacket_Kind, Participant } from 'livekit-client'
import { useUserStore } from '../providers/AuthProvider'
import { 
  CursorDataPacket, 
  CursorPosition, 
  generateUserColor 
} from '../stores/cursorStore'

interface UseLiveKitCursorOptions {
  setCursor: (userId: string, position: CursorPosition | null) => void
  setLocalCursor: (position: CursorPosition | null) => void
  setActive: (active: boolean) => void
  removeCursor: (userId: string) => void
  markCursorForRemoval: (userId: string) => void
  throttleMs?: number
}

export const useLiveKitCursor = ({
  setCursor,
  setLocalCursor,
  setActive,
  removeCursor,
  markCursorForRemoval,
  throttleMs = 50
}: UseLiveKitCursorOptions) => {
  const room = useContext(RoomContext)
  const username = useUserStore(state => state.username)
  
  const throttleRef = useRef<NodeJS.Timeout>()
  const userIdRef = useRef<string>()
  const userColorRef = useRef<string>()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  
  // Initialize user info
  useEffect(() => {
    if (username) {
      userIdRef.current = `${username}-${Date.now()}`
      userColorRef.current = generateUserColor(userIdRef.current)
    }
  }, [username])
  
  // LiveKit Data Packet 수신 리스너
  useEffect(() => {
    if (!room) return
    
    console.log('🎯 Setting up LiveKit cursor data listener')
    
    const handleDataReceived = (
      payload: Uint8Array, 
      participant: any, 
      kind: DataPacket_Kind, 
      topic?: string
    ) => {
      // 커서 토픽만 처리
      if (topic !== 'cursor') return
      
      try {
        const dataString = decoder.decode(payload)
        const cursorData: CursorDataPacket = JSON.parse(dataString)
        
        console.log('📨 Received cursor data:', {
          from: participant?.identity,
          type: cursorData.type,
          position: cursorData.x !== undefined ? `${cursorData.x},${cursorData.y}` : 'hidden'
        })
        
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
  
  // 참가자 연결 해제 감지
  useEffect(() => {
    if (!room) return
    
    console.log('🔌 Setting up participant disconnect listener')
    
    const handleParticipantDisconnected = (participant: Participant) => {
      console.log('👋 Participant disconnected with smooth animation:', participant.identity)
      
      // userId 매핑을 시도해보자 (participant.identity를 기반으로)
      // 실제로는 Data Packet의 userId와 participant.identity가 다를 수 있음
      
      // 방법 1: participant identity를 직접 사용해서 부드러운 제거
      markCursorForRemoval(participant.identity)
      setTimeout(() => {
        removeCursor(participant.identity)
      }, 300)
      
      // 방법 2: userId 패턴으로 찾기 (username-timestamp 형태)
      const usernameFromIdentity = participant.identity
      // 이 부분은 이미 CursorProvider에서 주기적으로 처리되고 있음
    }
    
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    
    return () => {
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    }
  }, [room, removeCursor, markCursorForRemoval])
  
  // 커서 위치 업데이트 함수 (로컬 표시 + DataChannel 전송 분리)
  const updateCursorPosition = useCallback((x: number, y: number) => {
    if (!room || !userIdRef.current || !userColorRef.current || !username) {
      console.log('updateCursorPosition: missing dependencies', {
        room: !!room,
        userId: !!userIdRef.current,
        userColor: !!userColorRef.current,
        username: !!username
      })
      return
    }
    
    // 1. 즉시 로컬 커서 업데이트 (실시간 표시용, throttling 없음)
    const localCursorData: CursorPosition = {
      x,
      y,
      userId: userIdRef.current!,
      userName: username,
      color: userColorRef.current!,
      timestamp: Date.now()
    }
    
    setLocalCursor(localCursorData) // 즉시 실행
    
    // 2. DataChannel 전송 (throttled)
    if (throttleRef.current) {
      clearTimeout(throttleRef.current)
    }
    
    throttleRef.current = setTimeout(() => {
      // LiveKit Data Packet으로 다른 사용자들에게 전송
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
      
      // Lossy 전송 (빠른 업데이트 우선)
      room.localParticipant?.publishData(data, {
        reliable: false,
        topic: 'cursor'
      }).catch(error => {
        console.error('Failed to publish cursor data:', error)
      })
      
      console.log('📡 Published cursor update (throttled):', { x, y, topic: 'cursor' })
    }, throttleMs)
  }, [room, username, setLocalCursor, encoder, throttleMs])
  
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
    
    room.localParticipant?.publishData(data, {
      reliable: false,
      topic: 'cursor'
    }).catch(error => {
      console.error('Failed to publish cursor hide:', error)
    })
    
    console.log('🫥 Published cursor hide')
  }, [room, username, setLocalCursor, encoder])
  
  return {
    updateCursorPosition,
    hideCursor,
    userId: userIdRef.current,
    userColor: userColorRef.current,
    isConnected: !!room?.isConnected
  }
}