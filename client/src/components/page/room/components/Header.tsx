'use client'

import Image from 'next/image'
import Link from 'next/link'

interface RoomInfo {
  id: string
  url: string
  title?: string
  createdAt: string
}

interface HeaderProps {
  roomInfo?: RoomInfo
  onLeaveRoom?: () => void
}

export default function Header({
  roomInfo,
  onLeaveRoom = () => {},
}: HeaderProps) {
  const handleLeaveRoom = () => {
    console.log('방 나가기')
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
    onLeaveRoom()
  }

  return (
    <header className="flex-shrink-0 border-b-2 border-[#2D3243] bg-[#f6f4f0] px-8 py-3">
      <div className="flex w-full items-center justify-center">
        {/* 왼쪽 공간 - 균형을 위한 빈 공간 */}
        {/* <div className="w-1/6"></div> */}

        {/* 중앙: NEARZOOM 로고 이미지 */}
        <Link href="/" className="flex flex-1 justify-center">
          <Image
            src="/nearzoomlogologo.png"
            alt="NEARZOOM"
            width={400}
            height={300}
            className="h-12 object-contain"
            priority
          />
        </Link>

        {/* 오른쪽: 설정 버튼만 */}
        {/* <div className="flex w-1/6 items-center justify-end">
          <button
            onClick={handleLeaveRoom}
            className="flex h-8 w-8 items-center justify-center rounded-sm transition-all hover:bg-[#2D3243]/10"
          >
            <svg
              className="h-4 w-4 text-[#2D3243]/70 hover:text-[#2D3243]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div> */}
      </div>
    </header>
  )
}
