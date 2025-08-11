'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Room } from 'livekit-client'
import { LiveKitRoom } from '@livekit/components-react'

import Header from '@/components/page/groupcall/Header'
import Sidebar from '@/components/page/groupcall/Sidebar'
import VideoTile from '@/components/page/groupcall/VideoTile'
import { JoinRoomData, CreateRoomData, roomAPI } from '@/lib/api/room'  // 🔥 추가: roomAPI import

interface Participant {
  id: string
  email: string
  name?: string
  avatar?: string
  isHost: boolean
  isMicOn: boolean
  isCameraOn: boolean
  isConnected: boolean
}

interface CurrentUser {
  id: string
  email: string
  name?: string
  avatar?: string
  isMicOn: boolean
  isCameraOn: boolean
}

interface RoomInfo {
  id: string
  url: string
  title?: string
  createdAt: string
}

interface WaitingPageProps {
  roomData?: JoinRoomData | CreateRoomData
  isHost?: boolean
  onStartCall?: () => void
}

export default function WaitingPage({
  roomData,
  isHost = true,
  onStartCall,
}: WaitingPageProps) {
  const [room] = useState(() => new Room())
  const [isConnected, setIsConnected] = useState(false)
  
  // 🔥 추가: 실제 참가자 데이터 상태
  const [realParticipants, setRealParticipants] = useState<Participant[]>([])
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false)

  // LiveKit connect
  useEffect(() => {
    if (roomData?.serverUrl && roomData?.participantToken) {
      const connectToRoom = async () => {
        try {
          console.log('LiveKit 연결 시도...', {
            serverUrl: roomData.serverUrl,
            roomId: roomData.roomId,
          })
          await room.connect(roomData.serverUrl, roomData.participantToken)
          console.log('LiveKit 연결 성공!')
          setIsConnected(true)
        } catch (error) {
          console.error('LiveKit 연결 실패:', error)
        }
      }
      connectToRoom()
    }

    return () => {
      room.disconnect()
    }
  }, [roomData, room])

  // 🔥 추가: 실제 방 정보 불러오기
  const loadRoomInfo = useCallback(async () => {
    if (!roomData?.roomId) return
    
    try {
      setIsLoadingParticipants(true)
      console.log('🔄 방 정보 불러오기 중...', roomData.roomId)
      
      // 🔥 수정: roomId를 숫자로 변환해서 전달
      const numericRoomId = typeof roomData.roomId === 'string' ? parseInt(roomData.roomId, 10) : roomData.roomId
      const roomInfo = await roomAPI.getRoomInfo(numericRoomId)
      console.log('✅ 방 정보 로드 성공:', roomInfo)
      
      // 서버 응답을 클라이언트 형식으로 변환
      const participants: Participant[] = roomInfo.participants.map(p => ({
        id: p.id,
        email: p.email,
        name: p.name || p.email.split('@')[0], // 이름이 없으면 이메일에서 추출
        isHost: p.isHost,
        isMicOn: true, // 기본값 (LiveKit에서 실제 상태 가져올 수 있음)
        isCameraOn: true, // 기본값
        isConnected: true, // 방에 있으므로 연결된 것으로 간주
      }))
      
      setRealParticipants(participants)
      console.log('👥 참가자 목록 업데이트:', participants)
      
    } catch (error) {
      console.error('❌ 방 정보 로드 실패:', error)
    } finally {
      setIsLoadingParticipants(false)
    }
  }, [roomData?.roomId])

  // 🔥 추가: 컴포넌트 마운트 시 방 정보 로드
  useEffect(() => {
    loadRoomInfo()
  }, [loadRoomInfo])

  // 🔥 추가: 주기적으로 방 정보 갱신 (10초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 주기적 방 정보 갱신')
      loadRoomInfo()
    }, 10000) // 10초마다

    return () => clearInterval(interval)
  }, [loadRoomInfo])

  // 🔥 추가: 브라우저 포커스 시 갱신
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 브라우저 포커스 - 방 정보 갱신')
      loadRoomInfo()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loadRoomInfo])

  const [roomInfo] = useState<RoomInfo>(() => {
    if (roomData) {
      return {
        id: roomData.roomId.toString(),
        url: `${typeof window !== 'undefined'
          ? window.location.origin
          : 'https://www.nearzoom.store'
        }/room/${roomData.roomId}`,
        createdAt:
          roomData.createdAt || (roomData as JoinRoomData).createdAt || '',
      }
    }
    return {
      id: 'room-123',
      url: 'meet.example.com/room-123',
      createdAt: 'July 24th, 2024 14:39 PM',
    }
  })

  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
    if (roomData) {
      return {
        id: 'current-user',
        email: 'current@user.com',
        name: roomData.participantName,
        isMicOn: true,
        isCameraOn: true,
      }
    }
    return {
      id: 'user-1',
      email: 'ssafy123.5@gmail.com',
      name: '김싸피',
      isMicOn: true,
      isCameraOn: true,
    }
  })

  // 🔥 수정: 실제 데이터 사용 (Mock 데이터 제거)
  const participants = useMemo(() => {
    if (realParticipants.length > 0) {
      return realParticipants
    }
    
    // 🔥 fallback: 서버 데이터 로딩 중이거나 실패한 경우에만 현재 사용자 표시
    if (roomData) {
      return [
        {
          id: 'current-user',
          email: 'current@user.com',
          name: roomData.participantName,
          isHost: isHost,
          isMicOn: true,
          isCameraOn: true,
          isConnected: true,
        },
      ]
    }
    
    return []
  }, [realParticipants, roomData, isHost])

  const gridCols = useMemo(() => {
    const count = participants.length
    if (count === 1) return 'grid-cols-1'
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2'
    if (count <= 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  }, [participants.length])

  const handleLeaveRoom = useCallback(() => {
    console.log('방 나가기')
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }, [])

  const handleCopyRoomUrl = useCallback(() => {
    if (roomInfo.url && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(roomInfo.url)
      console.log('URL 복사됨:', roomInfo.url)
      alert('방 URL이 복사되었습니다!')
    }
  }, [roomInfo.url])

  const handleMicToggle = useCallback(() => {
    setCurrentUser(prev => ({
      ...prev,
      isMicOn: !prev.isMicOn,
    }))
  }, [])

  const handleCameraToggle = useCallback(() => {
    setCurrentUser(prev => ({
      ...prev,
      isCameraOn: !prev.isCameraOn,
    }))
  }, [])

  const handleStartCall = useCallback(() => {
    console.log('통화 시작')
    if (isHost && onStartCall) {
      onStartCall()
    } else {
      console.log('방장이 시작할 때까지 대기 중...')
    }
  }, [isHost, onStartCall])

  // 🔥 추가: 수동 새로고침 버튼
  const handleRefreshParticipants = useCallback(() => {
    console.log('🔄 수동 참가자 목록 새로고침')
    loadRoomInfo()
  }, [loadRoomInfo])

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* 헤더 */}
      <Header roomInfo={roomInfo} onLeaveRoom={handleLeaveRoom} />

      <main className="flex flex-1 flex-col gap-4 bg-[#2d3243] p-4 md:flex-row md:gap-6 md:p-6 lg:p-8">
        {/* 비디오 영역 */}
        <section className="min-w-0 flex-1">
          {/* 🔥 추가: 로딩 상태 표시 */}
          {isLoadingParticipants && (
            <div className="absolute top-4 right-4 z-10 bg-blue-500 text-white px-3 py-1 rounded-lg text-sm">
              참가자 목록 업데이트 중...
            </div>
          )}
          
          {roomData?.serverUrl && roomData?.participantToken ? (
            // LiveKit 연결 모드
            <div className="relative">
              {!isConnected && (
                <div className="absolute top-4 left-4 z-10 bg-yellow-500 text-white px-3 py-1 rounded-lg text-sm">
                  LiveKit 연결 중...
                </div>
              )}
              {isConnected && (
                <div className="absolute top-4 left-4 z-10 bg-green-500 text-white px-3 py-1 rounded-lg text-sm">
                  ✅ 연결됨
                </div>
              )}

              <LiveKitRoom
                video={currentUser.isCameraOn}
                audio={currentUser.isMicOn}
                token={roomData.participantToken}
                serverUrl={roomData.serverUrl}
                room={room}
                data-lk-theme="default"
                style={{ height: '100%' }}
                onConnected={() => setIsConnected(true)}
                onDisconnected={() => setIsConnected(false)}
              >
                <div className={`grid gap-3 sm:gap-4 lg:gap-6 ${gridCols}`}>
                  {/* 본인 웹캠 */}
                  <div className="min-h-[180px] sm:min-h-[200px] lg:min-h-[240px] relative bg-gray-900 rounded-lg overflow-hidden">
                    <video
                      ref={(videoEl) => {
                        if (videoEl && currentUser.isCameraOn) {
                          navigator.mediaDevices
                            .getUserMedia({ video: true, audio: false })
                            .then(stream => {
                              videoEl.srcObject = stream
                            })
                            .catch(err => console.error('웹캠 접근 실패:', err))
                        }
                      }}
                      autoPlay
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      {currentUser.name || 'You'} {isHost && '(Host)'}
                    </div>
                  </div>

                  {/* 다른 참가자 */}
                  {participants.slice(1).map(p => (
                    <VideoTile
                      key={p.id}
                      participant={p}
                      className="min-h-[180px] sm:min-h-[200px] lg:min-h-[240px]"
                    />
                  ))}
                </div>
              </LiveKitRoom>
            </div>
          ) : (
            // Mock 데이터 모드
            <div className={`grid gap-3 sm:gap-4 lg:gap-6 ${gridCols}`}>
              {participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="min-h-[180px] sm:min-h-[200px] lg:min-h-[240px] relative bg-gray-900 rounded-lg overflow-hidden"
                >
                  {index === 0 && currentUser.isCameraOn ? (
                    <video
                      ref={(videoEl) => {
                        if (videoEl) {
                          navigator.mediaDevices
                            .getUserMedia({ video: true, audio: false })
                            .then(stream => {
                              videoEl.srcObject = stream
                            })
                            .catch(err => console.error('웹캠 접근 실패:', err))
                        }
                      }}
                      autoPlay
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <VideoTile
                      participant={participant}
                      className="w-full h-full"
                    />
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    {participant.name} {participant.isHost && '(Host)'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 사이드바 */}
        <aside className="w-full shrink-0 md:w-[300px]">
          <Sidebar
            participants={participants}
            currentUser={currentUser}
            roomUrl={roomInfo.url}
            showStartButton={isHost}
            showLeaveButton={true}
            onMicToggle={handleMicToggle}
            onCameraToggle={handleCameraToggle}
            onStartCall={handleStartCall}
            onLeaveRoom={handleLeaveRoom}
            onCopyRoomUrl={handleCopyRoomUrl}
          />
          
          {/* 🔥 추가: 디버그용 새로고침 버튼
          <div className="mt-4">
            <button
              onClick={handleRefreshParticipants}
              disabled={isLoadingParticipants}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
            >
              {isLoadingParticipants ? '업데이트 중...' : '참가자 목록 새로고침'}
            </button>
          </div> */}
        </aside>
      </main>
    </div>
  )
}