'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

import ControlPanel from '@/components/page/groupcall/ControlPanel'
import Header from '@/components/page/groupcall/Header'
import ParticipantList from '@/components/page/groupcall/ParticipantList'
import CompletionModal from '@/components/page/groupcall/photoshoot/CompletionModal'
import ProgressBar from '@/components/page/groupcall/photoshoot/ProgressBar'
import ScreenShareArea from '@/components/page/groupcall/photoshoot/ScreenShareArea'
import { cn } from '@/lib/utils'

// 타입 정의
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
  isHost: boolean
}

interface RoomInfo {
  id: string
  url: string
  title?: string
  createdAt: string
}

interface GroupShotRoomProps {
  participants?: Participant[]
  currentUser?: CurrentUser
  roomInfo?: RoomInfo
  currentCutIndex?: number
  isShooting?: boolean
  timer?: number
  screenStream?: MediaStream
  onStartCut?: () => void
  onCompleteCut?: () => void
  onMicToggle?: () => void
  onCameraToggle?: () => void
  onLeaveRoom?: () => void
  onCopyRoomUrl?: () => void
  className?: string
}

export default function GroupShotRoom({
  participants = [],
  currentUser = {
    id: 'me',
    email: 'ssafy123.5@gmail.com',
    name: '김싸피',
    isMicOn: true,
    isCameraOn: true,
    isHost: true,
  },
  roomInfo = {
    id: 'a605',
    url: 'ssafynearzoom.store/a605',
    title: 'SSAFY 13기 A605팀 4컷 촬영',
    createdAt: 'July 24th, 2024 14:39 PM',
  },
  isShooting = false,
  timer = 0,
  screenStream,
  currentCutIndex = 1,
  onStartCut = () => {},
  onMicToggle = () => {},
  onCameraToggle = () => {},
  onLeaveRoom = () => {},
  onCopyRoomUrl = () => {},
  className,
}: GroupShotRoomProps) {
  // 테스트용 상태
  const [testTimer, setTestTimer] = useState(0)
  const [testShooting, setTestShooting] = useState(false)
  const [currentUserState, setCurrentUserState] = useState(currentUser)
  const [testCutIndex, setTestCutIndex] = useState(currentCutIndex)

  // useCallback으로 최적화된 핸들러들
  const startTestTimer = useCallback(() => {
    setTestTimer(10)
    setTestShooting(true)

    const interval = setInterval(() => {
      setTestTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setTimeout(() => {
            setTestShooting(false)
            setTestTimer(0)
          }, 2000)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const handleMicToggle = useCallback(() => {
    setCurrentUserState(prev => ({
      ...prev,
      isMicOn: !prev.isMicOn,
    }))
    onMicToggle()
  }, [onMicToggle])

  const handleCameraToggle = useCallback(() => {
    setCurrentUserState(prev => ({
      ...prev,
      isCameraOn: !prev.isCameraOn,
    }))
    onCameraToggle()
  }, [onCameraToggle])

  const handleLeaveRoom = useCallback(() => {
    onLeaveRoom()
  }, [onLeaveRoom])

  const handleCopyRoomUrl = useCallback(() => {
    onCopyRoomUrl()
  }, [onCopyRoomUrl])

  const handleStartCut = useCallback(() => {
    onStartCut()
  }, [onStartCut])

  // 더미 참가자 데이터
  const mockParticipants: Participant[] = useMemo(
    () => [
      {
        id: '1',
        name: '김싸피',
        email: 'ssafy123.5@gmail.com',
        isHost: true,
        isMicOn: currentUserState.isMicOn,
        isCameraOn: currentUserState.isCameraOn,
        isConnected: true,
      },
      {
        id: '2',
        name: '박싸피',
        email: 'park.4@gmail.com',
        isHost: false,
        isMicOn: false,
        isCameraOn: true,
        isConnected: true,
      },
      {
        id: '3',
        name: '이싸피',
        email: 'lee.3@kakao.com',
        isHost: false,
        isMicOn: true,
        isCameraOn: false,
        isConnected: true,
      },
      {
        id: '4',
        name: '최싸피',
        email: 'choi.2@kakao.com',
        isHost: false,
        isMicOn: true,
        isCameraOn: true,
        isConnected: true,
      },
    ],
    [currentUserState.isMicOn, currentUserState.isCameraOn]
  )

  const displayParticipants = useMemo(
    () => (participants.length > 0 ? participants : mockParticipants),
    [participants, mockParticipants]
  )

  // 참가자를 누끼캠 형태로 변환
  const participantWebcams = useMemo(
    () =>
      displayParticipants.map(participant => ({
        id: participant.id,
        name: participant.name || participant.email,
        stream: undefined, // 실제로는 MediaStream이 들어감
        nukiUrl: participant.isCameraOn ? undefined : undefined,
      })),
    [displayParticipants]
  )

  // 컷 라벨
  const cutLabels = useMemo(() => ['1컷', '2컷', '3컷', '4컷'], [])

  // 완료 모달 상태
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  useEffect(() => {
    if (testCutIndex >= 4) {
      setShowCompletionModal(true)
    }
  }, [testCutIndex])

  const handleNextStep = useCallback(() => {
    setShowCompletionModal(false)
  }, [])

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50',
        className
      )}
    >
      {/* Header */}
      <Header roomInfo={roomInfo} onLeaveRoom={handleLeaveRoom} />

      {/* 메인 컨텐츠 */}
      <main className="flex flex-1 flex-col gap-4 bg-[#2d3243] p-4 md:flex-row md:gap-6 md:p-6 lg:p-8">
        {/* 메인 영역  */}
        <section className="min-w-0 flex-1">
          <div className="relative flex h-full min-h-[400px] flex-col rounded-2xl border border-white/20 bg-white/95 p-3 shadow-lg backdrop-blur-sm sm:p-4 lg:p-6">
            {/* 진행바  */}
            <div className="flex justify-center py-2 sm:py-3 lg:py-4">
              <ProgressBar
                currentStep={testCutIndex - 1}
                labels={cutLabels}
                className="mx-auto w-full max-w-xs sm:max-w-sm lg:max-w-md"
              />
            </div>

            {/* 화면 공유 영역  */}
            <div className="flex flex-1 items-center justify-center">
              <ScreenShareArea
                screenStream={screenStream}
                participantWebcams={participantWebcams}
                isTimerActive={testShooting || isShooting}
                timerSeconds={testShooting ? testTimer : timer}
                className="w-full"
              />
            </div>

            {/* 테스트 버튼  */}
            <div className="absolute top-2 left-2 z-40 sm:top-4 sm:left-4">
              <button
                onClick={startTestTimer}
                className="rounded-lg bg-purple-500 px-2 py-1 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-purple-600 sm:px-4 sm:py-2 sm:text-sm"
              >
                🧪 타이머 테스트
              </button>
              <button
                onClick={() => setTestCutIndex(4)}
                className="rounded-lg bg-green-500 px-2 py-1 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-green-600 sm:px-4 sm:py-2 sm:text-sm"
              >
                📸 완료 테스트
              </button>
              {(testShooting || testTimer > 0) && (
                <div className="mt-1 rounded bg-black/70 px-2 py-1 text-xs text-white sm:mt-2 sm:px-3 sm:text-sm">
                  테스트: {testTimer}초
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 사이드바  */}
        <aside className="w-full shrink-0 md:w-[300px] lg:w-80">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* 참가자 목록 */}
            <ParticipantList
              participants={displayParticipants}
              showStartButton={currentUserState.isHost}
              onStartCall={handleStartCut}
              startButtonText="PHOTO SHOOT"
              roomUrl={roomInfo.url}
              onCopyRoomUrl={handleCopyRoomUrl}
            />

            {/* 컨트롤 버튼들 */}
            <ControlPanel
              currentUser={currentUserState}
              onMicToggle={handleMicToggle}
              onCameraToggle={handleCameraToggle}
              onLeaveRoom={handleLeaveRoom}
              showLeaveButton={true}
            />
          </div>
        </aside>
      </main>

      {/* 완료 모달 */}
      <CompletionModal isOpen={showCompletionModal} onClose={handleNextStep} />
    </div>
  )
}
