'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from './providers/AuthProvider'
import PhotoBooth from './components/PhotoBooth'

type RoomPageProps = {
  roomName: string
}

export default function RoomPage({ roomName }: RoomPageProps) {
  const [mounted, setMounted] = useState(false)
  const username = useUserStore(state => state.username)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !username) {
      const redirectUrl = `/room/${roomName}`
      router.push(`/signin/test?redirect=${encodeURIComponent(redirectUrl)}`)
    }
  }, [mounted, username, roomName, router])

  // 서버와 클라이언트에서 동일한 렌더링 보장
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!username) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    )
  }

  return <PhotoBooth />
}
