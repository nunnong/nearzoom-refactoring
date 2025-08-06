'use client'

import {
  type ReactNode,
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from 'react'
import { useStore } from 'zustand'
import { create } from 'zustand'

import {
  createStateSlice,
  createFrameSlice,
  createCutSlice,
  createPhotoSlice,
  type PhotoBoothSlice,
} from '../stores/photobooth'
import { createRoomLeaderSlice } from '../stores/roomLeaderSlice'
import {
  useParticipants,
  useLocalParticipant,
  useRoomInfo,
  useRoomContext,
} from '@livekit/components-react'

// PhotoBooth only store type
export type PhotoBoothStore = PhotoBoothSlice

export type PhotoBoothStoreApi = ReturnType<typeof createPhotoBoothStore>

export const PhotoBoothStoreContext = createContext<
  PhotoBoothStoreApi | undefined
>(undefined)

export interface PhotoBoothProviderProps {
  children: ReactNode
  roomName: string
}

const createPhotoBoothStore = (roomName: string) => {
  console.log('🏗️ Creating PhotoBooth store for room:', roomName)

  // 모든 slice들을 통합한 store 생성
  return create<PhotoBoothStore>()((set, get) => ({
    ...createStateSlice(set, get, roomName),
    ...createFrameSlice(set, roomName),
    ...createCutSlice(set, get, roomName),
    ...createPhotoSlice(set, get, roomName),
    ...createRoomLeaderSlice(set),
  }))
}

export const PhotoBoothProvider = ({
  children,
  roomName,
}: PhotoBoothProviderProps) => {
  const { localParticipant } = useLocalParticipant()
  const participants = useParticipants()
  const { name: liveKitRoomName } = useRoomInfo()
  const room = useRoomContext()

  // useState를 사용하여 store를 한 번만 생성
  const [store] = useState(() => {
    console.log(`Creating PhotoBooth store for room: ${roomName}`)
    return createPhotoBoothStore(roomName)
  })

  // LiveKit 기반 방장 상태 계산
  const isRoomLeader = useMemo(() => {
    if (!localParticipant?.metadata) return false
    try {
      const metadata = JSON.parse(localParticipant.metadata)
      return metadata.role === 'host'
    } catch {
      return false
    }
  }, [localParticipant?.metadata])

  const currentRoomLeader = useMemo(() => {
    const hostParticipant = participants.find(p => {
      try {
        const metadata = JSON.parse(p.metadata || '{}')
        return metadata.role === 'host'
      } catch {
        return false
      }
    })
    return hostParticipant?.identity || null
  }, [participants])

  // 방장이 나갔을 때 자동으로 다음 참가자에게 권한 이전
  const handleHostDisconnection = async (disconnectedParticipant: any) => {
    try {
      // 나간 참가자가 방장이었는지 확인
      const metadata = JSON.parse(disconnectedParticipant.metadata || '{}')
      if (metadata.role !== 'host') return

      console.log('👑 Host disconnected, reassigning leadership...')

      // 남은 참가자 중 첫 번째 사람을 새 방장으로 지정
      const remainingParticipants = participants.filter(
        p => p.identity !== disconnectedParticipant.identity
      )

      if (remainingParticipants.length === 0) {
        console.log('⚠️ No participants left to assign as leader')
        return
      }

      const newLeader = remainingParticipants[0]
      console.log('🔄 Auto-assigning new leader:', newLeader.identity)

      // 현재 사용자가 새 방장이 되는 경우에만 API 호출
      if (
        localParticipant &&
        newLeader.identity === localParticipant.identity
      ) {
        const response = await fetch('/api/transfer-leadership', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: liveKitRoomName || roomName,
            fromParticipant: disconnectedParticipant.identity,
            toParticipant: newLeader.identity,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to auto-assign new leader')
        }

        console.log('✅ Successfully auto-assigned new leader')
      }
    } catch (error) {
      console.error('❌ Failed to handle host disconnection:', error)
    }
  }

  // LiveKit room 이벤트 리스너 설정
  useEffect(() => {
    if (!room) return

    const handleParticipantDisconnected = (participant: any) => {
      console.log('👋 Participant disconnected:', participant.identity)
      handleHostDisconnection(participant)
    }

    room.on('participantDisconnected', handleParticipantDisconnected)

    return () => {
      room.off('participantDisconnected', handleParticipantDisconnected)
    }
  }, [room, participants, localParticipant, roomName, liveKitRoomName])

  // Store에 LiveKit 권한 정보 동기화
  useEffect(() => {
    const roomNameToSet = liveKitRoomName || roomName
    const participantIdentity = localParticipant?.identity || ''

    console.log('🔄 Syncing LiveKit permissions to store:', {
      roomName: roomNameToSet,
      identity: participantIdentity,
      isHost: isRoomLeader,
      currentLeader: currentRoomLeader,
    })

    store.getState().setRoomName(roomNameToSet)
    store.getState().setCurrentUsername(participantIdentity)
    store.getState().setRoomLeader(currentRoomLeader)
    store.getState().setIsRoomLeader(isRoomLeader)
  }, [
    liveKitRoomName,
    roomName,
    localParticipant,
    currentRoomLeader,
    isRoomLeader,
    store,
  ])

  // Yjs PhotoBooth 상태 관리 활성화
  useEffect(() => {
    if (!roomName) return

    console.log('🎯 Initializing Yjs PhotoBooth state for room:', roomName)
    
    // Yjs 변경사항을 Zustand store에 반영하는 핸들러
    const onPhotoBoothUpdate = (data: any) => {
      console.log('📥 Received Yjs update:', data)
      
      // 각 slice별로 상태 업데이트
      if (data.photoBoothState !== undefined) {
        store.setState({ photoBoothState: data.photoBoothState })
      }
      if (data.frameColor !== undefined) {
        store.setState({ frameColor: data.frameColor })
      }
      if (data.cutCount !== undefined) {
        store.setState({ cutCount: data.cutCount })
      }
      if (data.currentCutIndex !== undefined) {
        store.setState({ currentCutIndex: data.currentCutIndex })
      }
      if (data.selectedPhotos !== undefined) {
        store.setState({ selectedPhotos: data.selectedPhotos })
      }
    }
    
    // Yjs 상태 동기화 시작
    const { initializePhotoBoothState } = require('../stores/photobooth')
    const cleanup = initializePhotoBoothState(roomName, onPhotoBoothUpdate)

    return () => {
      console.log('🧹 Cleaning up Yjs PhotoBooth state for room:', roomName)
      if (cleanup) cleanup()
    }
  }, [roomName, store])

  return (
    <PhotoBoothStoreContext.Provider value={store}>
      {children}
    </PhotoBoothStoreContext.Provider>
  )
}

export const usePhotoBoothStore = <T,>(
  selector: (store: PhotoBoothStore) => T
): T => {
  const photoBoothStoreContext = useContext(PhotoBoothStoreContext)

  if (!photoBoothStoreContext) {
    throw new Error(`usePhotoBoothStore must be used within PhotoBoothProvider`)
  }

  return useStore(photoBoothStoreContext, selector)
}
