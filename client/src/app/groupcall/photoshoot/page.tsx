'use client'

import { useState, useEffect } from 'react'

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
  timer?: number // 남은 타이머(초)
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
  currentCutIndex = 4,
  onStartCut = () => {},
  onMicToggle = () => {},
  onCameraToggle = () => {},
  onLeaveRoom = () => {},
  onCopyRoomUrl = () => {},
  className,
}: GroupShotRoomProps) {
  // 테스트용 상태 (개발 중에만 사용)
  const [testTimer, setTestTimer] = useState(0)
  const [testShooting, setTestShooting] = useState(false)

  // 테스트 타이머 함수
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
  
  // 더미 참가자 데이터 (participants가 비어있을 때 사용)
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

  // 참가자를 누끼캠 형태로 변환
  const participantWebcams = displayParticipants.map(participant => ({
    id: participant.id,
    name: participant.name || participant.email,
    stream: undefined, // 실제로는 MediaStream이 들어감
    nukiUrl: participant.isCameraOn ? undefined : undefined, // 누끼 처리된 이미지 URL
  }))

  // 컷 라벨(진행바 단계)
  const cutLabels = ['1컷', '2컷', '3컷', '4컷']
  // 현재 컷 인덱스가 마지막 컷을 넘어가면 완료 모달 표시
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  useEffect(() => {
    if (currentCutIndex >= 4) {
      setShowCompletionModal(true)
    }
  }, [currentCutIndex])

  const handleNextStep = () => {
    setShowCompletionModal(false)
  }

  return (
    <div className={cn('flex min-h-screen flex-col bg-gray-100', className)}>
      {/* Header */}
      <Header
        roomInfo={roomInfo}
        onLeaveRoom={onLeaveRoom}
        onCopyRoomUrl={onCopyRoomUrl}
      />

      {/* 메인 컨텐츠 */}
      <div className="flex flex-1 gap-6 px-8 py-6 bg-[#2d3243]">
        {/* 왼쪽: 메인 영역 (흰색 상자) */}
        <div className="flex flex-1">
          <div className="relative flex flex-1 flex-col rounded-2xl border border-gray-100 bg-white/90 p-6 shadow-sm">
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
                  isTimerActive={testShooting || isShooting}
                  timerSeconds={testShooting ? testTimer : timer}
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
        </div>

        {/* 오른쪽: 사이드바 */}
        <div className="flex w-80 flex-col gap-4">
          {/* 참가자 목록 */}
          <ParticipantList
            participants={displayParticipants}
            showStartButton={currentUser.isHost}
            onStartCall={onStartCut}
            startButtonText="촬영 시작" // 커스텀 텍스트
            roomUrl={roomInfo.url}
            onCopyRoomUrl={onCopyRoomUrl}
          />

          {/* 컨트롤 버튼들 */}
          <ControlPanel
            currentUser={currentUser}
            onMicToggle={onMicToggle}
            onCameraToggle={onCameraToggle}
            onLeaveRoom={onLeaveRoom}
            showLeaveButton={true}
          />
        </div>
      </div>

      {/* 완료 모달 */}
      <CompletionModal isOpen={showCompletionModal} onClose={handleNextStep} />
    </div>
  )
}