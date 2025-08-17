'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
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

  const user = useAuthStore(state => state.user)
  const username = user?.name
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
      url.searchParams.append('participantName', username || 'Guest')
      url.searchParams.append('faceImageUrl', user?.faceImageUrl || '')
      
      console.log('🔗 Requesting connection details with face image URL:', {
        roomName,
        participantName: username,
        faceImageUrl: user?.faceImageUrl ? 'provided' : 'empty'
      })

      const response = await fetch(url.toString())
      
      // 더 자세한 에러 정보 로깅
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Response Error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        })
        
        throw new Error(
          `Failed to fetch connection details: ${response.status} ${response.statusText}`
        )
      }

      const data: ConnectionDetails = await response.json()
      console.log('✅ Connection details received:', data)
      setConnectionDetails(data)
    } catch (error) {
      console.error('❌ Error fetching connection details:', error)
      
      // 더 구체적인 에러 메시지
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.'
        } else if (error.message.includes('500')) {
          errorMessage = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        } else {
          errorMessage = error.message
        }
      }
      
      setConnectionError(errorMessage)
    } finally {
      setIsConnecting(false)
    }
  }, [username, roomName, user?.faceImageUrl])

  // 마운트 체크
  useEffect(() => {
    setMounted(true)
  }, [])

  // 사용자가 없으면 에러 로그 (상위 page.tsx에서 이미 체크함)
  useEffect(() => {
    if (mounted && !user) {
      console.error('User not authenticated in RoomPage')
    }
  }, [mounted, user])

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">연결 오류</h2>
          <p className="text-gray-500 mb-6">{connectionError}</p>
          
          <div className="space-y-3">
            <button
              onClick={fetchConnectionDetails}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              다시 시도
            </button>
            
            <button
              onClick={() => router.push('/myroom')}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              My Room으로 돌아가기
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-sm text-gray-600 mb-2">문제 해결 방법:</p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• 네트워크 연결을 확인해주세요</li>
              <li>• 브라우저를 새로고침해보세요</li>
              <li>• 잠시 후 다시 시도해보세요</li>
            </ul>
          </div>
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
