// app/groupcall/waiting/page.tsx
'use client'

import { useCallback } from 'react'

import WaitingPage from '@/components/page/groupcall/WaitingPage'
import { roomAPI } from '@/lib/api/room'

export default function GroupCallWaitingPage() {
  // 방장이 Start 버튼을 눌렀을 때 방 생성
  const handleCreateRoom = useCallback(async () => {
    try {
      console.log('방 생성 시작...')
      
      // 방 생성 API 호출
      const roomData = await roomAPI.createRoom()
      
      console.log('방 생성 성공:', roomData)
      
      // 방 생성 성공 시 URL로 이동 (새로운 라우팅 페이지로)
      const roomUrl = `/room/${roomData.roomId}?isHost=true`
      window.location.href = roomUrl
      
    } catch (error) {
      console.error('방 생성 실패:', error)
      alert('방 생성에 실패했습니다. 다시 시도해주세요.')
    }
  }, [])

  return (
    <WaitingPage 
      isHost={true}
      onStartCall={handleCreateRoom}
    />
  )
}