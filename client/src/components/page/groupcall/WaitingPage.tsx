'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Room } from 'livekit-client'
import { LiveKitRoom } from '@livekit/components-react'
import { useAuthStore } from '@/stores/authStore'

import Header from '@/components/page/groupcall/Header'
import Sidebar from '@/components/page/groupcall/Sidebar'
import VideoTile from '@/components/page/groupcall/VideoTile'
import { JoinRoomData, CreateRoomData, roomAPI } from '@/lib/api/room'

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
  const { user } = useAuthStore()
  const [room] = useState(() => new Room())
  const [isConnected, setIsConnected] = useState(false)
  
  const [serverParticipants, setServerParticipants] = useState<string[]>([])
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

  // 방 정보 불러오기
  const loadRoomInfo = useCallback(async () => {
    if (!roomData?.roomId) return
    
    try {
      setIsLoadingParticipants(true)
      console.log('🔄 방 정보 불러오기 중...', roomData.roomId)
      
      const numericRoomId = typeof roomData.roomId === 'string' ? parseInt(roomData.roomId, 10) : roomData.roomId
      const roomInfo = await roomAPI.getRoomInfo(numericRoomId)
      console.log('✅ 방 정보 로드 성공:', roomInfo)
      
      // 서버에서 온 참가자 이름 배열을 그대로 저장
      const participantNames = roomInfo.participants || []
      setServerParticipants(participantNames)
      console.log('👥 참가자 이름 목록:', participantNames)
      
    } catch (error) {
      console.error('❌ 방 정보 로드 실패:', error)
      setServerParticipants([])
    } finally {
      setIsLoadingParticipants(false)
    }
  }, [roomData?.roomId])

  // 컴포넌트 마운트 시 방 정보 로드
  useEffect(() => {
    loadRoomInfo()
  }, [loadRoomInfo])

  // 주기적으로 방 정보 갱신 (10초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 주기적 방 정보 갱신')
      loadRoomInfo()
    }, 10000)

    return () => clearInterval(interval)
  }, [loadRoomInfo])

  // 브라우저 포커스 시 갱신
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
    return {
      id: 'current-user',
      email: user?.email || 'current@user.com',
      name: roomData?.participantName || user?.name || 'Loading...',
      isMicOn: true,
      isCameraOn: true,
    }
  })

  // 🔥 추가: user 정보가 변경될 때 currentUser 업데이트 (카카오 로그인 지연 대응)
  useEffect(() => {
    if (user?.email) {
      setCurrentUser(prev => ({
        ...prev,
        email: user.email,
        name: roomData?.participantName || user.name || prev.name
      }))
      console.log('🔄 사용자 정보 업데이트:', { email: user.email, name: user.name })
    }
  }, [user, roomData?.participantName])

  // 참가자 목록 생성 로직
  const participants = useMemo(() => {
    const participantList: Participant[] = []
    
    // 1. 현재 사용자를 첫 번째로 추가 (항상 표시)
    const currentUserParticipant: Participant = {
      id: 'current-user',
      email: user?.email || currentUser.email || 'current@user.com', // 🔥 실제 이메일 우선 사용
      name: roomData?.participantName || user?.name || currentUser.name || 'You',
      isHost: isHost, // 🔥 방 생성자만 Host
      isMicOn: true,
      isCameraOn: true,
      isConnected: true,
    }
    participantList.push(currentUserParticipant)
    
    console.log('🔍 현재 사용자 정보:', {
      userEmail: user?.email,
      userName: user?.name,
      currentUserEmail: currentUser.email,
      currentUserName: currentUser.name,
      roomDataName: roomData?.participantName,
      finalEmail: currentUserParticipant.email,
      finalName: currentUserParticipant.name
    })
    
    // 2. 서버에서 온 다른 참가자들 추가
    if (serverParticipants.length > 0) {
      const currentUserName = roomData?.participantName || user?.name || currentUser.name
      
      serverParticipants.forEach((participantName, index) => {
        // 현재 사용자와 같은 이름이면 건너뛰기 (중복 방지)
        if (participantName === currentUserName) {
          console.log('🔄 중복 참가자 건너뛰기:', participantName)
          return
        }
        
        participantList.push({
          id: `server-participant-${index}`,
          email: `${participantName.toLowerCase().replace(/\s+/g, '')}@unknown.com`, // 임시 이메일
          name: participantName,
          isHost: false, // 🔥 다른 참가자는 Host가 아님
          isMicOn: true,
          isCameraOn: true,
          isConnected: true,
        })
      })
    }
    
    console.log('🎯 최종 참가자 목록:', participantList)
    return participantList
  }, [serverParticipants, roomData, user, currentUser, isHost])

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
      console.log('방 URL 복사됨:', roomInfo.url)
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

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* 헤더 */}
      <Header roomInfo={roomInfo} onLeaveRoom={handleLeaveRoom} />

      <main className="flex flex-1 flex-col gap-4 bg-[#2d3243] p-4 md:flex-row md:gap-6 md:p-6 lg:p-8">
        {/* 비디오 영역 */}
        <section className="min-w-0 flex-1">
          {/* 로딩 상태 표시 */}
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
        </aside>
      </main>
    </div>
  )
}