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
  onLeaveRoom?: () => void
  onCopyRoomUrl?: () => void
}

export default function Header({
  roomInfo,
  onLeaveRoom = () => {},
  onCopyRoomUrl = () => {},
}: HeaderProps) {
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(`https://${roomInfo.url}`)
      alert('URL이 복사되었습니다!')
      onCopyRoomUrl()
    } catch (err) {
      console.error('복사 실패:', err)
      alert('복사에 실패했습니다.')
    }
  }

  return (
    <header className="flex-shrink-0 border-b border-[#2D3243]/80 bg-[#2D3243] px-8 py-4">
      <div className="flex w-full items-center justify-between">
        {/* 왼쪽: 로고 & 방 정보 */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 transition-transform duration-200 hover:scale-105">
              <Image
                src="/link-icon.png"
                alt="Link Icon"
                width={28}  
                height={28}
                className="rotate-[10deg] opacity-90 drop-shadow-lg"
              />
            <div className="relative">
              <div>
              <h1 className="text-xl font-bold text-white">[Near-zoom]</h1>
              <p className="text-sm text-[#C9D76D] mt-1 ml-1">{roomInfo.createdAt}</p>
            </div>
              
            </div>
          </div>

          <div className="h-8 w-px bg-white/40"></div>

          {/* Room URL */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-white">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"
                />
              </svg>
              <span className="text-sm">친구들을 초대하세요!</span>
            </div>

            <button
              onClick={handleCopyUrl}
              className="group flex items-center gap-2 rounded-full border border-[#C9D76D]/30 bg-[#C9D76D]/20 px-4 py-2 transition-all hover:scale-105 hover:bg-[#C9D76D]/30"
            >
              <span className="font-mono text-sm text-[#C9D76D]">
                {roomInfo.url}
              </span>
              <div className="flex items-center gap-1">
                <svg
                  className="h-4 w-4 text-[#C9D76D] group-hover:text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs text-[#C9D76D]">복사</span>
              </div>
            </button>
          </div>
        </div>

        {/* 오른쪽: 설정 버튼 */}
        <div className="flex items-center gap-4">
          <button
            onClick={onLeaveRoom}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:scale-110 hover:bg-white/10"
          >
            <svg
              className="h-5 w-5 text-white"
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
        </div>
      </div>
    </header>
  )
}