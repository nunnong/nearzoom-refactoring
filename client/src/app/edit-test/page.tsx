'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { roomAPI, type CreateRoomData } from '@/lib/api/room'

export default function EditTestPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const { setRoomData: storeRoomData, setIsHost } = useRoomStore()

  const [roomData, setRoomData] = useState<CreateRoomData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return // 인증 상태 로딩 중 대기

    if (!isAuthenticated) {
      alert('로그인이 필요합니다.')
      router.push('/')
      return
    }

    // 로그인된 상태에서 자동 방 생성
    createRoom()
  }, [isAuthenticated, authLoading, router])

  const createRoom = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('자동 방 생성 시작...')
      const result = await roomAPI.createRoom(
        JSON.stringify({ roomname: 'photobooth' })
      )

      setRoomData(result)
      console.log('방 생성 성공:', result)

      // Zustand store에 방 데이터 저장 (방장으로 설정)
      storeRoomData(result)
      setIsHost(true)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '방 생성에 실패했습니다.'
      setError(errorMessage)
      console.error('방 생성 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="p-8">
        <h1 className="mb-4 text-2xl font-bold">인증 확인 중...</h1>
      </div>
    )
  }

  return (
    <div className="h-screen bg-white p-8">
      <h1 className="mb-4 text-2xl font-bold">Edit Test Page</h1>

      {loading && (
        <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            <p className="text-blue-700">방을 생성하는 중...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-4">
          <p className="text-red-700">오류: {error}</p>
          <button
            onClick={createRoom}
            className="mt-2 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      )}

      {roomData && (
        <div className="mb-4 rounded border border-green-200 bg-green-50 p-4">
          <h2 className="mb-2 text-lg font-semibold text-green-800">
            방 생성 완료!
          </h2>
          <div className="mb-4 space-y-2 text-sm text-green-700">
            <p>
              <strong>Room ID:</strong> {roomData.roomId}
            </p>
            <p>
              <strong>Server URL:</strong> {roomData.serverUrl}
            </p>
            <p>
              <strong>Participant Name:</strong> {roomData.participantName}
            </p>
            <p>
              <strong>Created At:</strong> {roomData.createdAt}
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push(`/edit-test/${roomData.roomId}`)}
              className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-md transition-transform duration-200 hover:scale-105"
            >
              API 테스팅하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
