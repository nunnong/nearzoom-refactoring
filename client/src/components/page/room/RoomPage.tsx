'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from './providers/AuthProvider'
import { PhotoBoothProvider } from './providers/PhotoBoothProvider'
import { CursorProvider } from './providers/CursorProvider'
import PhotoBooth from './components/PhotoBooth'
import DebugPanel from './components/DebugPanel'
import { RoomContext } from '@livekit/components-react'
import { Room, RoomConnectOptions } from 'livekit-client'
import { ConnectionDetails } from './types/livekit'

const CONN_DETAILS_ENDPOINT = '/api/connection-details'

type RoomPageProps = {
  roomName: string
}

export default function RoomPage({ roomName }: RoomPageProps) {
  const [mounted, setMounted] = useState(false)
  const [connectionDetails, setConnectionDetails] = useState<
    ConnectionDetails | undefined
  >(undefined)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const username = useUserStore(state => state.username)
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const room = useMemo(() => new Room(), [])

  const connectOptions = useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    }
  }, [])

  // 토큰 가져오기 함수
  const fetchConnectionDetails = useCallback(async () => {
    if (!username || !roomName) return

    try {
      setIsConnecting(true)
      setConnectionError(null)

      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin)
      url.searchParams.append('roomName', roomName)
      url.searchParams.append('participantName', username)

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(
          `Failed to fetch connection details: ${response.statusText}`
        )
      }

      const data: ConnectionDetails = await response.json()
      setConnectionDetails(data)
    } catch (error) {
      console.error('Error fetching connection details:', error)
      setConnectionError(
        error instanceof Error ? error.message : 'Unknown error'
      )
    } finally {
      setIsConnecting(false)
    }
  }, [username, roomName])

  // 마운트 체크
  useEffect(() => {
    setMounted(true)
  }, [])

  // username이 없으면 리다이렉트
  useEffect(() => {
    if (mounted && !username) {
      const redirectUrl = `/room-test/${roomName}`
      router.push(`/signin/test?redirect=${encodeURIComponent(redirectUrl)}`)
    }
  }, [mounted, username, roomName, router])

  // 토큰 가져오기
  useEffect(() => {
    if (mounted && username && !connectionDetails && !isConnecting) {
      fetchConnectionDetails()
    }
  }, [
    mounted,
    username,
    connectionDetails,
    isConnecting,
    fetchConnectionDetails,
  ])

  // LiveKit Room 연결
  useEffect(() => {
    if (connectionDetails && room) {
      room
        .connect(
          connectionDetails.serverUrl,
          connectionDetails.participantToken,
          connectOptions
        )
        .catch(error => {
          console.error('Failed to connect to room:', error)
        })
      room.localParticipant.enableCameraAndMicrophone().catch(error => {
        console.error(error)
      })
    }

    // Cleanup
    return () => {
      if (room) {
        room.disconnect()
      }
    }
  }, [connectionDetails, room, connectOptions])

  // 로딩 상태들
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!username) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    )
  }

  if (isConnecting || !connectionDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">방에 연결 중...</p>
        </div>
      </div>
    )
  }

  if (connectionError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600">연결 오류: {connectionError}</p>
          <button
            onClick={fetchConnectionDetails}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full">
      <RoomContext.Provider value={room}>
        <PhotoBoothProvider roomName={roomName}>
          <CursorProvider containerRef={containerRef}>
            <PhotoBooth />
            <DebugPanel />
          </CursorProvider>
        </PhotoBoothProvider>
      </RoomContext.Provider>
    </div>
  )
}
