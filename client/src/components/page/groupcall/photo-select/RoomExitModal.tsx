import { useEffect, useState } from 'react'

interface RoomExitModalProps {
  isOpen: boolean
  onClose: () => void
  onExitRoom: () => void
}


// CompletionModal의 카메라 아이콘 컴포넌트
function BouncyCamera() {
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setFlash(true)
      setTimeout(() => setFlash(false), 200)
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative">
      {flash && (
        <div className="absolute inset-0 animate-ping rounded-full bg-yellow-300 opacity-75" />
      )}

      <div
        className="relative rounded-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4"
        style={{
          animation: 'bounce 1s infinite',
        }}
      >
        <div className="rounded-full bg-white p-3 shadow-lg">
          <svg
            className="h-12 w-12 text-gray-700"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M9 2l1.17 1H15a2 2 0 012 2v1h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h2V5a2 2 0 012-2h4M9 9a3 3 0 106 0 3 3 0 00-6 0m6 0a3 3 0 11-6 0 3 3 0 016 0z" />
            <circle
              cx="17"
              cy="7"
              r="1"
              fill="currentColor"
              className="animate-pulse"
            />
          </svg>
        </div>

        <div className="absolute -top-1 -right-1 h-3 w-3 animate-ping rounded-full bg-yellow-400" />
        <div
          className="absolute -bottom-1 -left-1 h-2 w-2 animate-pulse rounded-full bg-pink-400"
          style={{ animationDelay: '0.5s' }}
        />
        <div
          className="absolute top-2 -left-2 h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400"
          style={{ animationDelay: '1s' }}
        />
      </div>
    </div>
  )
}


// 색종이 조각 애니메이션 (초록 계열 색상으로 변경)
function SuccessConfetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className={`absolute h-2 w-2 animate-pulse rounded-sm ${
            [
              'bg-green-400',
              'bg-emerald-400',
              'bg-teal-400',
              'bg-yellow-400',
              'bg-orange-400',
              'bg-pink-400',
            ][i % 6]
          }`}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${1 + Math.random()}s`,
          }}
        />
      ))}
    </div>
  )
}


export default function RoomExitModal({
  isOpen,
  onClose,
  onExitRoom,
}: RoomExitModalProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setShowConfetti(true)
      }, 400)

      return () => {
        clearTimeout(timer)
        setShowConfetti(false)
      }
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleExitRoom = () => {
    onExitRoom()
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* 배경 오버레이 */}
      <div
        className={`fixed inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleBackdropClick}
      />

      {/* 모달 본체 */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className={`relative flex w-full max-w-md flex-col items-center gap-6 overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-2xl transition-all duration-500 ${
            isOpen ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-12'
          }`}
        >
          {/* 색종이 효과 */}
          {showConfetti && <SuccessConfetti />}

          {/* 배경 그라데이션 */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-50/50 via-emerald-50/50 to-teal-50/50" />

          <div className="relative z-10 flex flex-col items-center gap-4">
            {/* 카메라 아이콘 */}
            <BouncyCamera />

            <h3 className="text-2xl font-bold text-gray-800 text-center">
              🎉 꾸미기 완료! 🎉
            </h3>

            <div className="space-y-3 text-center">
              {/* <p className="text-lg font-semibold text-gray-700">
                모든 사진이 완성되었습니다!
              </p>*/}
              <p className="text-rg leading-relaxed text-gray-600">
                완성된 사진은 <span className="font-extrabold text-lg text-navy-600">MyRoom</span>에 저장됩니다.
                <br />
                그룹방을 종료하고 결과를 확인해보세요!
              </p>
            </div>
          </div>

          {/* 버튼 */}
          <button
            type="button"
            onClick={handleExitRoom}
            className="relative z-10 w-full transform rounded-2xl bg-gradient-to-r from-[#2d3243] to-[#3a4158] px-6 py-4 font-bold text-lg text-white transition-all duration-300 hover:scale-105 hover:from-[#343a52] hover:to-[#404668] hover:shadow-xl focus:ring-4 focus:ring-[#2d3243]/50 focus:outline-none active:scale-95"
            style={{
              boxShadow: '0 8px 32px rgba(45, 50, 67, 0.4)',
            }}
          >
            방 종료하기
          </button>

          <button
            type="button"
            onClick={onClose}
            className="relative z-10 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            취소
          </button>

          {/* 추가 장식 요소들 */}
          <div
            className="absolute top-4 left-4 text-2xl opacity-50"
            style={{
              animation: 'spin 4s linear infinite'
            }}
          >
            🌟
          </div>
          <div
            className="absolute top-4 right-4 text-2xl opacity-50"
            style={{
              animation: 'spin 4s linear infinite reverse'
            }}
          >
            ✨
          </div>
        </div>
      </div>
    </div>
  )
}
