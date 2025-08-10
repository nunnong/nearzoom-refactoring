'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Room } from 'livekit-client'
import { LiveKitRoom } from '@livekit/components-react'

import Header from '@/components/page/groupcall/Header'
import Sidebar from '@/components/page/groupcall/Sidebar'
import VideoTile from '@/components/page/groupcall/VideoTile'
import { JoinRoomData, CreateRoomData } from '@/lib/api/room'

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

  const [participants] = useState<Participant[]>(() => {
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
    return [
      {
        id: 'user-1',
        email: 'ssafy123.5@gmail.com',
        name: '김싸피',
        isHost: true,
        isMicOn: true,
        isCameraOn: true,
        isConnected: true,
      },
      {
        id: 'user-2',
        email: 'park.4@gmail.com',
        name: '박싸피',
        isHost: false,
        isMicOn: false,
        isCameraOn: true,
        isConnected: true,
      },
      {
        id: 'user-3',
        email: 'lee.3@kakao.com',
        name: '이싸피',
        isHost: false,
        isMicOn: true,
        isCameraOn: false,
        isConnected: true,
      },
      {
        id: 'user-4',
        email: 'choi.2@kakao.com',
        name: '최싸피',
        isHost: false,
        isMicOn: true,
        isCameraOn: true,
        isConnected: true,
      },
    ]
  })

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

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* 헤더 */}
      <Header roomInfo={roomInfo} onLeaveRoom={handleLeaveRoom} />

      <main className="flex flex-1 flex-col gap-4 bg-[#2d3243] p-4 md:flex-row md:gap-6 md:p-6 lg:p-8">
        {/* 비디오 영역 */}
        <section className="min-w-0 flex-1">
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
