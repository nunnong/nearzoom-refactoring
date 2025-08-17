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
        {/* 중앙: NEARZOOM 로고 이미지 */}
        <Link href="/" className="flex justify-center">
          <Image
            src="/nearzoomlogologo.png"
            alt="NEARZOOM"
            width={200}
            height={150}
            className="h-8 object-contain"
            priority
          />
        </Link>
      </div>
    </header>
  )
}
