'use client'

import Image from 'next/image'

interface RoomInfo {
  id: string
  url: string
  title?: string
  createdAt: string
}

interface HeaderProps {
  roomInfo: RoomInfo
}

export default function Header({ roomInfo }: HeaderProps) {
  return (
    <header className="flex-shrink-0 border-b-2 border-[#2D3243] bg-[#f6f4f0] px-4 py-3 sm:px-6 md:px-8">
      <div className="flex w-full items-center justify-center">
        {/* 중앙: NEARZOOM 로고 이미지 - 반응형 크기 */}
        <div className="flex justify-center">
          <Image
            src="/nearzoomlogologo.png"
            alt="NEARZOOM"
            width={400}
            height={300}
            className="h-8 object-contain sm:h-10 md:h-12"
            priority
          />
        </div>
      </div>
    </header>
  )
}