'use client'

import { useState, useEffect } from 'react'
import CompletionModal from './CompletionModal'
import ProgressBar from './ProgressBar'
import ScreenShareArea from './ScreenShareArea'
import Timer from './Timer'
import Sidebar from '../Sidebar'
import { cn } from '@/lib/utils'

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

interface PhotoshootComponentProps {
  participants?: Participant[]
  currentUser?: CurrentUser
  currentCutIndex?: number
  isShooting?: boolean
  timer?: number
  screenStream?: MediaStream
  onStartCut?: () => void
  onCompleteCut?: () => void
  onMicToggle?: () => void
  onCameraToggle?: () => void
  onLeaveRoom?: () => void
  onComplete?: () => void
  className?: string
}

export default function PhotoshootComponent({
  participants = [],
  currentUser = {
    id: 'me',
    email: 'ssafy123.5@gmail.com',
    name: '김싸피',
    isMicOn: true,
    isCameraOn: true,
    isHost: true,
  },
  isShooting = false,
  timer = 0,
  screenStream,
  currentCutIndex = 1,
  onStartCut = () => {},
  onMicToggle = () => {},
  onCameraToggle = () => {},
  onLeaveRoom = () => {},
  onComplete = () => {},
  className,
}: PhotoshootComponentProps) {
  const [testTimer, setTestTimer] = useState(0)
  const [testShooting, setTestShooting] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  const startTestTimer = () => {
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
  }

  const mockParticipants: Participant[] = [
    {
      id: '1',
      name: '김싸피',
      email: 'ssafy123.5@gmail.com',
      isHost: true,
      isMicOn: true,
      isCameraOn: true,
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
  ]

  const displayParticipants =
    participants.length > 0 ? participants : mockParticipants

  const participantWebcams = displayParticipants.map(participant => ({
    id: participant.id,
    name: participant.name || participant.email,
    stream: undefined,
    nukiUrl: participant.isCameraOn ? undefined : undefined,
  }))

  const cutLabels = ['1컷', '2컷', '3컷', '4컷']

  useEffect(() => {
    if (currentCutIndex >= 4) {
      setShowCompletionModal(true)
    }
  }, [currentCutIndex])

  const handleNextStep = () => {
    setShowCompletionModal(false)
    onComplete()
  }

  return (
    <div className={cn('flex flex-1 gap-6 bg-gray-100 px-8 py-6', className)}>
      <div className="relative flex flex-1 flex-col">
        {/* 진행바 */}
        <div className="flex justify-center py-3">
          <ProgressBar
            currentStep={currentCutIndex - 1}
            labels={cutLabels}
            className="mx-auto"
          />
        </div>

        {/* 화면 공유 영역 */}
        <div className="flex flex-1 items-center justify-center pb-3">
          <div className="relative w-full max-w-4xl">
            <ScreenShareArea
              screenStream={screenStream}
              participantWebcams={participantWebcams}
            />

            {/* 타이머 오버레이 */}
            <Timer
              isActive={testShooting || isShooting}
              seconds={testShooting ? testTimer : timer}
            />

            {/* 테스트 버튼 */}
            <div className="absolute top-4 left-4 z-40">
              <button
                onClick={startTestTimer}
                className="rounded-lg bg-purple-500 px-4 py-2 font-semibold text-white shadow-lg transition-colors hover:bg-purple-600"
              >
                🧪 타이머 테스트
              </button>
              {(testShooting || testTimer > 0) && (
                <div className="mt-2 rounded bg-black/70 px-3 py-1 text-sm text-white">
                  테스트: {testTimer}초
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 오른쪽: 사이드바 */}
      <Sidebar
        participants={displayParticipants}
        currentUser={currentUser}
        showStartButton={currentUser.isHost}
        showLeaveButton={true}
        onStartCall={onStartCut}
        onMicToggle={onMicToggle}
        onCameraToggle={onCameraToggle}
        onLeaveRoom={onLeaveRoom}
      />

      {/* 완료 모달 */}
      <CompletionModal isOpen={showCompletionModal} onClose={handleNextStep} />
    </div>
  )
}
