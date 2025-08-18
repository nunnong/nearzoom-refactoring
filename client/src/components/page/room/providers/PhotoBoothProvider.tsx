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
  createCutSlice,
  createSelectSlice,
  createShootingSlice,
  createPhotoCanvasSlice,
  createCanvasSlice,
  createEditSlice,
  type PhotoBoothSlice,
} from '../stores/photobooth'
import { createRoomLeaderSlice } from '../stores/roomLeaderSlice'
import {
  useParticipants,
  useLocalParticipant,
  useRoomInfo,
  useRoomContext,
} from '@livekit/components-react'
import {
  VirtualBackground,
  supportsBackgroundProcessors,
} from '@livekit/track-processors'
import { Track } from 'livekit-client'

// PhotoBooth only store type
export type PhotoBoothStore = PhotoBoothSlice

export type PhotoBoothStoreApi = ReturnType<typeof createPhotoBoothStore>

// VirtualBackground Context
export const VirtualBackgroundContext = createContext<{
  virtualBackgroundReady: boolean
}>({
  virtualBackgroundReady: false,
})

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
  return create<PhotoBoothStore>()((set, get, store) => ({
    ...createStateSlice(set, get, roomName),
    ...createCutSlice(set, get, roomName),
    ...createSelectSlice(set, get, roomName),
    ...createShootingSlice(set, get, roomName),
    ...createPhotoCanvasSlice(set, get, store),
    ...createCanvasSlice(set, get, store),
    ...createEditSlice(set, get, roomName),
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
  const [store] = useState<ReturnType<typeof createPhotoBoothStore>>(() => {
    console.log(`Creating PhotoBooth store for room: ${roomName}`)
    return createPhotoBoothStore(roomName)
  })

  // VirtualBackground 준비 상태 (로컬 상태)
  const [virtualBackgroundReady, setVirtualBackgroundReady] = useState(false)

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

    // 방장인 경우 localStorage에서 캡처된 이미지들 로드
    if (isRoomLeader && roomNameToSet) {
      const { loadPhotosFromStorage } = require('../utils/photoStorage')
      const storedPhotos = loadPhotosFromStorage(roomNameToSet)

      if (storedPhotos.length > 0) {
        store.setState({ capturedImages: storedPhotos })
      }
    } else {
      // 비방장은 캡처된 이미지 없음
      store.setState({ capturedImages: [] })
    }
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
      // Shooting slice 상태 업데이트
      if (data.isShooting !== undefined) {
        store.setState({ isShooting: data.isShooting })
      }
      if (data.shootingTimer !== undefined) {
        store.setState({ shootingTimer: data.shootingTimer })
      }
      if (data.isCapturing !== undefined) {
        store.setState({ isCapturing: data.isCapturing })
      }
      if (data.capturedImages !== undefined) {
        store.setState({ capturedImages: data.capturedImages })
      }
      if (data.currentShootingCut !== undefined) {
        store.setState({ currentShootingCut: data.currentShootingCut })
      }
      // PhotoCanvas slice 상태 업데이트 - Yjs가 Single Source of Truth
      if (data.participants !== undefined) {
        // syncFromYjs를 사용하여 Yjs 데이터를 그대로 반영
        const { syncFromYjs } = store.getState()
        if (syncFromYjs) {
          syncFromYjs(data.participants, data.selectedParticipant || null)
        } else {
          // fallback: 직접 상태 업데이트
          store.setState({
            participants: data.participants,
            selectedParticipant: data.selectedParticipant || null,
          })
        }
      } else if (data.selectedParticipant !== undefined) {
        // 선택 상태만 업데이트
        store.setState({ selectedParticipant: data.selectedParticipant })
      }
      // Edit slice 상태 업데이트
      if (data.selectedPhotoUrls !== undefined) {
        store.setState({ selectedPhotoUrls: data.selectedPhotoUrls })
      }
      if (data.photoPersonIds !== undefined) {
        store.setState({ photoPersonIds: data.photoPersonIds })
      }
      if (data.processedPhotoUrls !== undefined) {
        store.setState({ processedPhotoUrls: data.processedPhotoUrls })
      }
      if (data.currentEditIndex !== undefined) {
        store.setState({ currentEditIndex: data.currentEditIndex })
      }
      if (data.backgroundType !== undefined) {
        store.setState({ backgroundType: data.backgroundType })
      }
      if (data.selectedColor !== undefined) {
        store.setState({ selectedColor: data.selectedColor })
      }
      if (data.promptText !== undefined) {
        store.setState({ promptText: data.promptText })
      }
      if (data.photoBackgrounds !== undefined) {
        store.setState({ photoBackgrounds: data.photoBackgrounds })
      }
      if (data.editSessionStarted !== undefined) {
        store.setState({ editSessionStarted: data.editSessionStarted })
      }
    }

    // Yjs 상태 동기화 시작
    const { initializePhotoBoothState } = require('../stores/photobooth')
    const cleanup = initializePhotoBoothState(roomName, onPhotoBoothUpdate)

    return () => {
      console.log('🧹 Cleaning up Yjs PhotoBooth state for room:', roomName)

      // 타이머 정리 (방장인 경우)
      if (isRoomLeader) {
        const currentState = store.getState()
        if (typeof currentState.cleanupTimer === 'function') {
          currentState.cleanupTimer()
        }
      }

      if (cleanup) cleanup()
    }
  }, [roomName, store, isRoomLeader])

  // VirtualBackground 관리 (PhotoBooth 진입 시 즉시 적용)
  useEffect(() => {
    if (!localParticipant) return

    let processor: any = null
    let currentVideoTrack: any = null

    const setupVirtualBackground = async () => {
      try {
        // 브라우저 지원 확인
        if (!supportsBackgroundProcessors()) {
          console.warn('❌ Background processors not supported in this browser')
          return
        }

        console.log('🔧 Setting up VirtualBackground...')

        // 기존 published video track 확인
        const videoTrackPubs = Array.from(
          localParticipant.videoTrackPublications.values()
        )
        let videoTrack = videoTrackPubs[0]?.track

        // 트랙이 없으면 카메라 활성화만 시도 (새 트랙 생성하지 않음)
        if (!videoTrack) {
          console.log('📹 No existing video track, enabling camera...')
          try {
            // LiveKit의 표준 방식으로 카메라 활성화
            await localParticipant.setCameraEnabled(true)

            // 카메라 활성화 후 트랙 다시 확인
            const newVideoTrackPubs = Array.from(
              localParticipant.videoTrackPublications.values()
            )
            videoTrack = newVideoTrackPubs[0]?.track

            if (videoTrack) {
              console.log('✅ Camera enabled, video track found')
            } else {
              console.warn('⚠️ Camera enabled but no video track found')
              return
            }
          } catch (cameraError) {
            console.error('❌ Failed to enable camera:', cameraError)
            return
          }
        }

        if (!videoTrack || videoTrack.kind !== Track.Kind.Video) {
          console.log('⚠️ No valid video track found for VirtualBackground')
          return
        }

        currentVideoTrack = videoTrack

        // 크로마키 배경 이미지 사용
        console.log('🎨 Creating VirtualBackground with chromakey-bg.png...')
        processor = VirtualBackground('/chromakey-bg.png')

        console.log(
          '📝 Applying chromakey background to existing video track...'
        )
        await videoTrack.setProcessor(processor)
        console.log(
          '✅ VirtualBackground applied successfully to existing track!'
        )

        // VirtualBackground 적용 완료 상태 업데이트
        setVirtualBackgroundReady(true)
        console.log('🎨 VirtualBackground ready state set to true')
      } catch (error) {
        console.error('❌ Error setting up VirtualBackground:', error)
      }
    }

    // PhotoBooth 진입 시 즉시 VirtualBackground 적용
    console.log('🎯 PhotoBooth mounted, applying VirtualBackground immediately')
    setupVirtualBackground()

    return () => {
      // PhotoBooth 언마운트 시에만 정리
      console.log('🧹 Cleaning up VirtualBackground...')
      if (processor && currentVideoTrack) {
        try {
          currentVideoTrack.setProcessor(undefined)
          processor.destroy()
          console.log('✅ VirtualBackground cleaned up')
        } catch (error) {
          console.warn(
            '⚠️ Error cleaning up VirtualBackground processor:',
            error
          )
        }
      }
    }
  }, [localParticipant, store])

  return (
    <VirtualBackgroundContext.Provider value={{ virtualBackgroundReady }}>
      <PhotoBoothStoreContext.Provider value={store}>
        {children}
      </PhotoBoothStoreContext.Provider>
    </VirtualBackgroundContext.Provider>
  )
}

export const useVirtualBackgroundReady = () => {
  const context = useContext(VirtualBackgroundContext)
  if (!context) {
    throw new Error(
      'useVirtualBackgroundReady must be used within PhotoBoothProvider'
    )
  }
  return context.virtualBackgroundReady
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
