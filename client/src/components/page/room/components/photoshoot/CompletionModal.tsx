import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useEffect, useState } from 'react'

interface CompletionModalProps {
  isOpen: boolean
  onClose: () => void
  isRoomLeader: boolean
}

// 애니메이션이 있는 카메라 아이콘 컴포넌트
function BouncyCamera() {
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    // 모달이 열릴 때 플래시 효과
    const timer = setTimeout(() => {
      setFlash(true)
      setTimeout(() => setFlash(false), 200)
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative">
      {/* 플래시 효과 */}
      {flash && (
        <div className="absolute inset-0 animate-ping rounded-full bg-yellow-300 opacity-75" />
      )}

      {/* 카메라 아이콘 배경 */}
      <div
        className="relative rounded-full bg-gradient-to-br from-green-100 via-yellow-100 to-lime-100 p-4"
        style={{
          animation: 'bounce 1s infinite',
        }}
      >
        <div className="rounded-full bg-white p-3 shadow-lg">
          {/* 커스텀 카메라 SVG */}
          <svg
            className="h-12 w-12 text-gray-700"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            {/* 카메라 본체 */}
            <path d="M9 2l1.17 1H15a2 2 0 012 2v1h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h2V5a2 2 0 012-2h4M9 9a3 3 0 106 0 3 3 0 00-6 0m6 0a3 3 0 11-6 0 3 3 0 016 0z" />
            {/* 플래시 */}
            <circle
              cx="17"
              cy="7"
              r="1"
              fill="currentColor"
              className="animate-pulse"
            />
          </svg>
        </div>

        {/* 반짝이는 효과들 */}
        <div className="absolute -top-1 -right-1 h-3 w-3 animate-ping rounded-full bg-yellow-400" />
        <div
          className="absolute -bottom-1 -left-1 h-2 w-2 animate-pulse rounded-full bg-lime-400"
          style={{ animationDelay: '0.5s' }}
        />
        <div
          className="absolute top-2 -left-2 h-1.5 w-1.5 animate-bounce rounded-full bg-green-400"
          style={{ animationDelay: '1s' }}
        />
      </div>
    </div>
  )
}

// 색종이 조각 애니메이션
function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 색종이 조각들 */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className={`absolute h-2 w-2 animate-pulse rounded-sm ${
            [
              'bg-red-400',
              'bg-blue-400',
              'bg-yellow-400',
              'bg-green-400',
              'bg-purple-400',
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

export default function CompletionModal({
  isOpen,
  onClose,
  isRoomLeader,
}: CompletionModalProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 색종이 효과 시작
      const timer = setTimeout(() => {
        setShowConfetti(true)
      }, 400)

      return () => {
        clearTimeout(timer)
        setShowConfetti(false)
      }
    }
  }, [isOpen])

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={() => {}}>
        {/* 배경 오버레이 */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm" />
        </Transition.Child>

        {/* 모달 본체 */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-500"
            enterFrom="opacity-0 scale-50 rotate-12"
            enterTo="opacity-100 scale-100 rotate-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100 rotate-0"
            leaveTo="opacity-0 scale-95 translate-y-4"
          >
            <Dialog.Panel className="relative flex w-full max-w-md flex-col items-center gap-6 overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-2xl">
              {/* 색종이 효과 */}
              {showConfetti && <Confetti />}

              {/* 배경 그라데이션 */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-50/50 via-yellow-50/50 to-lime-50/50" />

              <div className="relative z-10 flex flex-col items-center gap-4">
                {/* 통통 튀는 카메라 아이콘 */}
                <BouncyCamera />

                <Dialog.Title
                  as="h3"
                  className="animate-pulse text-2xl font-bold text-gray-800"
                >
                  📸 촬영 완료! 📸
                </Dialog.Title>

                <div className="space-y-2 text-center">
                  <p className="text-sm leading-relaxed text-gray-600">
                    프레임과 배경을 선택해서
                    <br />
                    나만의 특별한 사진을 만들어보세요 ✨
                  </p>
                </div>
              </div>

              {/* 버튼 - 모든 참가자 활성화 */}
              <button
                type="button"
                onClick={onClose}
                className="relative z-10 w-full transform rounded-2xl bg-gradient-to-r from-[#C9D76D] to-[#A8C046] px-6 py-4 font-bold text-[#2D3243] transition-all duration-300 hover:scale-105 hover:from-[#D5E087] hover:to-[#C9D76D] hover:shadow-xl focus:ring-4 focus:ring-[#C9D76D]/50 focus:outline-none active:scale-95"
                style={{
                  boxShadow: '0 8px 32px rgba(201, 215, 109, 0.4)',
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  꾸미기 시작하기
                </span>
              </button>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}