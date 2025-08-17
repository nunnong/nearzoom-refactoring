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
        {/* 중앙: NEARZOOM 레터 로고 - 반응형 크기 */}
        <div className="flex items-end gap-1 md:gap-2 lg:gap-3 select-none">
          <div className="relative w-6 h-8 sm:w-8 sm:h-10 md:w-10 md:h-12 lg:w-12 lg:h-14">
            <Image src="/letter-nn.png" alt="N" fill sizes="(max-width: 640px) 24px, (max-width: 1024px) 32px, 40px" className="object-contain" priority />
          </div>
          <div className="relative w-6 h-8 sm:w-8 sm:h-10 md:w-10 md:h-12 lg:w-12 lg:h-14">
            <Image src="/letter-ee.png" alt="E" fill sizes="(max-width: 640px) 24px, (max-width: 1024px) 32px, 40px" className="object-contain" priority />
          </div>
          <div className="relative w-7 h-9 sm:w-9 sm:h-11 md:w-11 md:h-13 lg:w-12 lg:h-14">
            <Image src="/letter-aa.png" alt="A" fill sizes="(max-width: 640px) 28px, (max-width: 1024px) 36px, 40px" className="object-contain" priority />
          </div>
          <div className="relative w-6 h-8 sm:w-8 sm:h-10 md:w-10 md:h-12 lg:w-12 lg:h-14">
            <Image src="/letter-rr.png" alt="R" fill sizes="(max-width: 640px) 24px, (max-width: 1024px) 32px, 40px" className="object-contain" priority />
          </div>
          <div className="w-2 sm:w-3 lg:w-4" />
          <div className="relative w-6 h-8 sm:w-8 sm:h-10 md:w-10 md:h-12 lg:w-12 lg:h-14">
            <Image src="/letter-zz.png" alt="Z" fill sizes="(max-width: 640px) 24px, (max-width: 1024px) 32px, 40px" className="object-contain" priority />
          </div>
          <div className="relative w-7 h-9 sm:w-9 sm:h-11 md:w-11 md:h-13 lg:w-12 lg:h-14">
            <Image src="/letter-oo.png" alt="O" fill sizes="(max-width: 640px) 28px, (max-width: 1024px) 36px, 40px" className="object-contain" priority />
          </div>
          <div className="relative w-7 h-9 sm:w-9 sm:h-11 md:w-11 md:h-13 lg:w-12 lg:h-14">
            <Image src="/letter-oo.png" alt="O" fill sizes="(max-width: 640px) 28px, (max-width: 1024px) 36px, 40px" className="object-contain" priority />
          </div>
          <div className="relative w-8 h-10 sm:w-10 sm:h-12 md:w-12 md:h-14 lg:w-14 lg:h-16">
            <Image src="/letter-mm.png" alt="M" fill sizes="(max-width: 640px) 32px, (max-width: 1024px) 40px, 48px" className="object-contain" priority />
          </div>
        </div>
      </div>
    </header>
  )
}