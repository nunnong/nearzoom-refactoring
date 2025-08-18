'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Tab } from '@headlessui/react'
import { API_ENDPOINTS } from '@/constants/api'
import api from '@/lib/axios'
import PhotoPicker from './components/PhotoPicker'
import FrameColorSelector from './components/FrameColorSelector'

type ApiResult = {
  success: boolean
  data?: any
  error?: string
  timestamp: string
}

export default function RoomTestPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user, setUser } = useAuthStore()

  const roomId = params.roomname as string
  const [results, setResults] = useState<Record<string, ApiResult>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [authCheckComplete, setAuthCheckComplete] = useState(false)
  
  // 사진 업로드 관련 상태
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadResults, setUploadResults] = useState<Record<string, any>>({})
  
  // 그룹 사진 관련 상태
  const [groupPhotos, setGroupPhotos] = useState<string[]>([])
  const [selectedGroupPhotos, setSelectedGroupPhotos] = useState<string[]>([])
  const [frameColor, setFrameColor] = useState<string>('#FFFFFF')
  const [cutCount, setCutCount] = useState<number>(2)
  
  // 배경 처리 관련 상태
  const [backgroundType, setBackgroundType] = useState<'prompt' | 'color'>('prompt')
  const [promptText, setPromptText] = useState<string>('korean school')
  const [backgroundColor, setBackgroundColor] = useState<string>('#FFFFFF')
  const [personOrder, setPersonOrder] = useState<string[]>([])
  const [processingResults, setProcessingResults] = useState<Record<string, any>>({})

  // 프레임 색상 팔레트
  const frameColorPalette = [
    '#FFFFFF', '#F5F5F5', '#E8E8E8',
    '#FF6B6B', '#4ECDC4', '#45B7D1',
    '#96CEB4', '#FFEAA7', '#DDA0DD',
  ]

  // localStorage에서 그룹 사진 로드
  useEffect(() => {
    const loadGroupPhotos = () => {
      try {
        const savedPhotos = localStorage.getItem(`groupPhotos_${roomId}`)
        if (savedPhotos) {
          const photoUrls = JSON.parse(savedPhotos)
          setGroupPhotos(photoUrls)
          console.log('그룹 사진 로드:', photoUrls)
        }
      } catch (error) {
        console.error('그룹 사진 로드 실패:', error)
      }
    }
    
    loadGroupPhotos()
  }, [roomId])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const checkAuthentication = () => {
      // localStorage에 토큰이 있는지 확인
      const hasToken = typeof window !== 'undefined' && localStorage.getItem('accessToken')
      
      if (authLoading) {
        // AuthProvider 초기화 중이면 잠시 대기
        return
      }

      if (!isAuthenticated) {
        if (hasToken) {
          // 토큰은 있는데 아직 인증되지 않은 상태 - 조금 더 대기
          timeoutId = setTimeout(() => {
            setAuthCheckComplete(true)
          }, 2000) // 2초 후 최종 체크
          return
        } else {
          // 토큰도 없으면 즉시 로그인 페이지로
          setAuthCheckComplete(true)
          return
        }
      }

      // 인증 성공
      setAuthCheckComplete(true)
    }

    checkAuthentication()

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [isAuthenticated, authLoading, router])

  // 인증 체크 완료 후 최종 처리
  useEffect(() => {
    if (authCheckComplete && !isAuthenticated) {
      alert('로그인이 필요합니다.')
      router.push('/')
    }
  }, [authCheckComplete, isAuthenticated, router])

  const apiCall = async (name: string, url: string, method: 'GET' | 'POST' | 'DELETE', body?: any) => {
    setLoading(prev => ({ ...prev, [name]: true }))
    
    try {
      let response: any
      
      if (method === 'GET') {
        response = await api.get(url)
      } else if (method === 'POST') {
        response = await api.post(url, body)
      } else if (method === 'DELETE') {
        response = await api.delete(url)
      }
      
      setResults(prev => ({
        ...prev,
        [name]: {
          success: true,
          data: response?.data,
          timestamp: new Date().toLocaleTimeString()
        }
      }))
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        [name]: {
          success: false,
          error: error.response?.data || error.message || 'Unknown error',
          timestamp: new Date().toLocaleTimeString()
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }))
    }
  }

  const testApis = [
    {
      category: '방 참가/퇴장',
      apis: [
        {
          name: 'join',
          title: '회의룸 참가',
          method: 'POST' as const,
          url: '/room/join',
          body: { roomId }
        },
        {
          name: 'leave',
          title: '개별 참가자 퇴장',
          method: 'POST' as const,
          url: '/room/leave',
          body: { roomId }
        }
      ]
    },
    {
      category: '방 관리',
      apis: [
        {
          name: 'close',
          title: '방장에 의한 회의룸 종료',
          method: 'DELETE' as const,
          url: `/room/${roomId}/close`
        },
        {
          name: 'info',
          title: '회의룸 정보',
          method: 'GET' as const,
          url: `/room/${roomId}/info`
        }
      ]
    },
    {
      category: '참가자 관리',
      apis: [
        {
          name: 'participants',
          title: '활성 참가자 목록',
          method: 'GET' as const,
          url: `/room/${roomId}/participants`
        },
        {
          name: 'transfer-host',
          title: '방장 권한 이양',
          method: 'POST' as const,
          url: '/room/transfer-host',
          body: { roomId, newHostId: 'target_user_id' }
        },
        {
          name: 'is-host',
          title: '방장 권한 확인',
          method: 'GET' as const,
          url: `/room/${roomId}/is-host`
        },
        {
          name: 'become-host',
          title: '방장 되기 (즉시 요청)',
          method: 'POST' as const,
          url: `/room/${roomId}/become-host`
        }
      ]
    }
  ]

  const goToRoom = () => {
    router.push(`/room/${roomId}?isHost=true&skipJoin=true`)
  }

  // 얼굴 사진 선택 핸들러
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      
      // 미리보기 생성
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // 그룹 사진 업로드 핸들러
  const handleGroupPhotosSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setLoading(prev => ({ ...prev, 'group-photos': true }))
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        console.log('그룹 사진 업로드 시작:', file.name)
        
        const formData = new FormData()
        formData.append('file', file, file.name)
        formData.append('type', 'group')
        
        const uploadResponse = await api.post(
          'https://image.nearzoom.store/upload',
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            withCredentials: false,
          }
        )
        
        const imageUrl = uploadResponse.data?.data?.file_url
        if (!imageUrl) throw new Error(`이미지 URL을 받아올 수 없습니다: ${file.name}`)
        
        console.log('그룹 사진 업로드 성공:', imageUrl)
        return imageUrl
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      
      // 기존 사진에 추가
      const newGroupPhotos = [...groupPhotos, ...uploadedUrls]
      setGroupPhotos(newGroupPhotos)
      
      // localStorage에 저장
      localStorage.setItem(`groupPhotos_${roomId}`, JSON.stringify(newGroupPhotos))
      
      setUploadResults(prev => ({
        ...prev,
        'group-photos': {
          success: true,
          data: {
            uploadedCount: uploadedUrls.length,
            totalCount: newGroupPhotos.length,
            urls: uploadedUrls
          },
          timestamp: new Date().toLocaleTimeString()
        }
      }))

      alert(`${uploadedUrls.length}장의 그룹 사진이 성공적으로 업로드되었습니다!`)
      
    } catch (error: any) {
      console.error('그룹 사진 업로드 실패:', error)
      setUploadResults(prev => ({
        ...prev,
        'group-photos': {
          success: false,
          error: error.response?.data || error.message || 'Group photos upload failed',
          timestamp: new Date().toLocaleTimeString()
        }
      }))
      alert('그룹 사진 업로드에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(prev => ({ ...prev, 'group-photos': false }))
      // 파일 입력 초기화
      event.target.value = ''
    }
  }

  // 그룹 사진 삭제
  const deleteGroupPhoto = (urlToDelete: string) => {
    const newGroupPhotos = groupPhotos.filter(url => url !== urlToDelete)
    setGroupPhotos(newGroupPhotos)
    
    // 선택된 사진에서도 제거
    setSelectedGroupPhotos(prev => prev.filter(url => url !== urlToDelete))
    
    // localStorage 업데이트
    localStorage.setItem(`groupPhotos_${roomId}`, JSON.stringify(newGroupPhotos))
    
    console.log('그룹 사진 삭제:', urlToDelete)
  }

  // 그룹 사진 전체 삭제
  const clearAllGroupPhotos = () => {
    if (confirm('모든 그룹 사진을 삭제하시겠습니까?')) {
      setGroupPhotos([])
      setSelectedGroupPhotos([])
      localStorage.removeItem(`groupPhotos_${roomId}`)
      console.log('모든 그룹 사진 삭제')
    }
  }

  // 얼굴 사진 저장 함수
  const saveFaceImage = async () => {
    if (!selectedImage) {
      alert('먼저 이미지를 선택해주세요.')
      return
    }

    const confirmed = confirm('선택한 이미지를 얼굴 사진으로 저장하시겠습니까?')
    if (!confirmed) return

    setLoading(prev => ({ ...prev, 'face-image': true }))
    
    try {
      
      // 1단계: 외부 이미지 서버에 업로드
      const formData = new FormData()
      formData.append('file', selectedImage, 'profile.jpg')
      formData.append('type', 'profile')
      
      console.log('FormData 생성 완료')
      console.log('FormData entries:')
      for (let [key, value] of formData.entries()) {
        console.log(key, value)
      }
      
      console.log('1단계: 외부 이미지 서버 업로드 시작')
      
      const uploadResponse = await api.post(
        'https://image.nearzoom.store/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: false,
        }
      )
      
      console.log('이미지 업로드 응답:', uploadResponse.data)
      
      const imageUrl = uploadResponse.data?.data?.file_url
      if (!imageUrl) throw new Error('이미지 URL을 받아올 수 없습니다.')
      
      console.log('받은 이미지 URL:', imageUrl)

      // 2단계: 백엔드에 이미지 URL 저장
      console.log('2단계: 백엔드에 이미지 URL 저장 시작')
      
      await api.put('/user/save-face-image', null, {
        params: { prettyFaceUrl: imageUrl }
      })
      
      console.log('얼굴 사진 URL 저장 완료')

      // 3단계: 사용자 정보 업데이트
      const userInfoResponse = await api.get(API_ENDPOINTS.USER_INFO)
      console.log('사용자 정보 업데이트:', userInfoResponse.data)
      
      // 4단계: AuthStore 업데이트
      const updatedUser = userInfoResponse.data.data
      console.log('=== 얼굴 사진 저장 후 사용자 정보 업데이트 ===')
      console.log('API 응답 전체:', userInfoResponse.data)
      console.log('updatedUser:', updatedUser)
      console.log('updatedUser.faceImageUrl:', updatedUser?.faceImageUrl)
      setUser(updatedUser)
      
      // setUser 호출 후 상태 확인 (비동기로 약간 지연)
      setTimeout(() => {
        console.log('setUser 호출 후 현재 user 상태:', useAuthStore.getState().user)
        console.log('setUser 호출 후 faceImageUrl:', useAuthStore.getState().user?.faceImageUrl)
      }, 100)
      
      setUploadResults(prev => ({
        ...prev,
        'face-image': {
          success: true,
          data: {
            uploadResult: uploadResponse.data,
            savedImageUrl: imageUrl,
            updatedUser: updatedUser
          },
          timestamp: new Date().toLocaleTimeString()
        }
      }))

      // 성공 메시지
      alert('얼굴 사진이 성공적으로 저장되었습니다!')
      
      // 선택된 이미지 초기화
      setSelectedImage(null)
      setImagePreview(null)
      
    } catch (error: any) {
      console.error('얼굴 사진 저장 실패:', error)
      setUploadResults(prev => ({
        ...prev,
        'face-image': {
          success: false,
          error: error.response?.data || error.message || 'Face image save failed',
          timestamp: new Date().toLocaleTimeString()
        }
      }))
      alert('얼굴 사진 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(prev => ({ ...prev, 'face-image': false }))
    }
  }

  // 1단계: 사진 선택 API (/photoprompt/selection)
  const sendPhotoSelection = async () => {
    if (selectedGroupPhotos.length === 0) {
      alert('먼저 사진을 선택해주세요.')
      return
    }

    setLoading(prev => ({ ...prev, 'photo-selection': true }))
    
    try {
      console.log('=== 사진 선택 API 호출 시작 ===')
      
      // 선택된 사진들의 인덱스 계산
      const selectedCutIds = selectedGroupPhotos.map(selectedPhoto => 
        groupPhotos.indexOf(selectedPhoto) + 1 // 1-based index
      )

      const requestData = {
        roomId: parseInt(roomId),
        selectedCutIds: selectedCutIds,
        cutCount: selectedGroupPhotos.length,
        frameColor: frameColor
      }

      console.log('요청 데이터:', requestData)
      
      const response = await api.post(API_ENDPOINTS.PHOTO_SELECTION, requestData)
      
      console.log('사진 선택 API 성공:', response.data)
      
      setProcessingResults(prev => ({
        ...prev,
        'photo-selection': {
          success: true,
          data: response.data,
          timestamp: new Date().toLocaleTimeString()
        }
      }))

      alert('사진 선택이 성공적으로 전송되었습니다!')
      
    } catch (error: any) {
      console.error('사진 선택 API 실패:', error)
      setProcessingResults(prev => ({
        ...prev,
        'photo-selection': {
          success: false,
          error: error.response?.data || error.message || 'Photo selection failed',
          timestamp: new Date().toLocaleTimeString()
        }
      }))
      alert('사진 선택 전송에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(prev => ({ ...prev, 'photo-selection': false }))
    }
  }

  // 2단계: 배경 처리 API (/photoprompt/image/background)
  const processSelectedPhotos = async () => {
    if (selectedGroupPhotos.length === 0) {
      alert('먼저 사진을 선택해주세요.')
      return
    }

    if (personOrder.length === 0) {
      alert('참가자 순서(prettyFaceUrl)를 입력해주세요.')
      return
    }

    if (backgroundType === 'prompt' && !promptText.trim()) {
      alert('배경 프롬프트를 입력해주세요.')
      return
    }

    setLoading(prev => ({ ...prev, 'background-processing': true }))
    
    try {
      console.log('=== 배경 처리 API 호출 시작 ===')
      
      const processPromises = selectedGroupPhotos.map(async (imageUrl, index) => {
        const requestData = {
          roomId: parseInt(roomId),
          imageUrl: imageUrl,
          backgroundType: backgroundType,
          personIds: personOrder,
          ...(backgroundType === 'prompt' 
            ? { promptText: promptText }
            : { colorValue: backgroundColor }
          )
        }

        console.log(`사진 ${index + 1} 처리 요청:`, requestData)
        
        const response = await api.post(API_ENDPOINTS.PHOTO_BACKGROUND, requestData)
        
        console.log(`사진 ${index + 1} 처리 완료:`, response.data)
        return { index: index + 1, imageUrl, result: response.data }
      })

      const results = await Promise.all(processPromises)
      
      setProcessingResults(prev => ({
        ...prev,
        'background-processing': {
          success: true,
          data: {
            totalProcessed: results.length,
            results: results
          },
          timestamp: new Date().toLocaleTimeString()
        }
      }))

      alert(`${results.length}장의 사진 배경 처리가 완료되었습니다!`)
      
    } catch (error: any) {
      console.error('배경 처리 API 실패:', error)
      setProcessingResults(prev => ({
        ...prev,
        'background-processing': {
          success: false,
          error: error.response?.data || error.message || 'Background processing failed',
          timestamp: new Date().toLocaleTimeString()
        }
      }))
      alert('배경 처리에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(prev => ({ ...prev, 'background-processing': false }))
    }
  }

  // 이미지 업로드 API 테스트
  const uploadImage = async (endpoint: string, description: string) => {
    if (!selectedImage) {
      alert('먼저 이미지를 선택해주세요.')
      return
    }

    setLoading(prev => ({ ...prev, [endpoint]: true }))
    
    try {
      const formData = new FormData()
      formData.append('image', selectedImage)
      
      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      setUploadResults(prev => ({
        ...prev,
        [endpoint]: {
          success: true,
          data: response.data,
          timestamp: new Date().toLocaleTimeString()
        }
      }))
    } catch (error: any) {
      setUploadResults(prev => ({
        ...prev,
        [endpoint]: {
          success: false,
          error: error.response?.data || error.message || 'Upload failed',
          timestamp: new Date().toLocaleTimeString()
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [endpoint]: false }))
    }
  }

  if (authLoading || !authCheckComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-lg text-gray-600">
            {authLoading ? '인증 상태 확인 중...' : '초기화 대기 중...'}
          </p>
          <p className="text-sm text-gray-400 mt-2">잠시만 기다려주세요</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">룸 테스팅 도구</h1>
            <p className="text-lg text-gray-600">
              Room ID: <span className="font-mono text-blue-600">{roomId}</span>
            </p>
          </div>
          <button
            onClick={goToRoom}
            className="rounded-lg bg-gradient-to-r from-green-500 to-blue-500 px-6 py-3 font-semibold text-white shadow-md transition-transform duration-200 hover:scale-105"
          >
            실제 룸 입장하기
          </button>
        </div>

        <Tab.Group>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-8">
            <Tab
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                  selected
                    ? 'bg-white shadow'
                    : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                }`
              }
            >
              방 관리 API
            </Tab>
            <Tab
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                  selected
                    ? 'bg-white shadow'
                    : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                }`
              }
            >
              사진 편집
            </Tab>
          </Tab.List>
          
          <Tab.Panels>
            {/* 방 관리 API 탭 */}
            <Tab.Panel>
              <div className="space-y-8">
                {/* 얼굴 사진 관리 섹션 */}
                <div className="rounded-lg bg-white p-6 shadow-lg">
                  <h2 className="mb-4 text-xl font-semibold text-gray-800">얼굴 사진 관리</h2>
                  
                  <div className="flex items-center space-x-6 mb-6">
                    <div className="flex-shrink-0">
                      {user?.faceImageUrl ? (
                        <div className="relative">
                          <img
                            src={user.faceImageUrl}
                            alt="현재 얼굴 사진"
                            className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-lg"
                          />
                          <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                            ✓
                          </div>
                        </div>
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-dashed border-gray-400 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-gray-400 text-3xl mb-1">👤</div>
                            <div className="text-xs text-gray-500">사진 없음</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {user?.name || '사용자'}님의 얼굴 사진
                      </h3>
                      {user?.faceImageUrl ? (
                        <div className="space-y-2">
                          <p className="text-sm text-green-600">✅ 얼굴 사진이 설정되어 있습니다.</p>
                          <p className="text-xs text-gray-500">
                            포토부스에서 AI가 당신을 인식할 수 있습니다.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-orange-600">⚠️ 얼굴 사진이 설정되지 않았습니다.</p>
                          <p className="text-xs text-gray-500">
                            포토부스 기능을 사용하려면 얼굴 사진을 등록해주세요.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 얼굴 사진 업로드 */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        새 얼굴 사진 업로드
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>

                    {/* 이미지 비교 뷰 */}
                    {imagePreview && (
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* 현재 얼굴 사진 */}
                          <div className="text-center">
                            <h4 className="text-sm font-medium text-gray-600 mb-2">현재 얼굴 사진</h4>
                            {user?.faceImageUrl ? (
                              <img
                                src={user.faceImageUrl}
                                alt="현재 얼굴 사진"
                                className="w-48 h-48 mx-auto rounded-lg object-cover border-2 border-gray-300"
                              />
                            ) : (
                              <div className="w-48 h-48 mx-auto rounded-lg bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-gray-400 text-4xl mb-2">👤</div>
                                  <div className="text-sm text-gray-500">사진 없음</div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* 새로 선택한 이미지 */}
                          <div className="text-center">
                            <h4 className="text-sm font-medium text-gray-600 mb-2">새로 선택한 이미지</h4>
                            <img
                              src={imagePreview}
                              alt="새 이미지 미리보기"
                              className="w-48 h-48 mx-auto rounded-lg object-cover border-2 border-blue-300"
                            />
                            <div className="mt-2">
                              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                → 새 얼굴 사진
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 text-center">
                          <p className="text-sm text-gray-500 mb-3">
                            파일명: {selectedImage?.name} ({((selectedImage?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                          </p>
                          
                          {/* 얼굴 사진 저장 버튼 */}
                          <button
                            onClick={saveFaceImage}
                            disabled={loading['face-image']}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading['face-image'] ? (
                              <>
                                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                저장 중...
                              </>
                            ) : (
                              <>
                                <span className="mr-2">💾</span>
                                얼굴 사진으로 저장
                              </>
                            )}
                          </button>
                        </div>

                        {/* 얼굴 사진 저장 결과 표시 */}
                        {uploadResults['face-image'] && (
                          <div className={`mt-4 rounded p-4 text-sm border-l-4 ${
                            uploadResults['face-image'].success 
                              ? 'bg-green-50 border-green-400 border-l-green-500' 
                              : 'bg-red-50 border-red-400 border-l-red-500'
                          }`}>
                            <div className="flex items-center justify-between mb-3">
                              <span className={`font-semibold ${
                                uploadResults['face-image'].success ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {uploadResults['face-image'].success ? '✅ 얼굴 사진 저장 성공!' : '❌ 얼굴 사진 저장 실패'}
                              </span>
                              <span className="text-gray-500 text-xs">{uploadResults['face-image'].timestamp}</span>
                            </div>
                            
                            {uploadResults['face-image'].success && (
                              <div className="text-green-700 text-sm mb-2">
                                🎉 포토부스에서 AI가 당신을 인식할 수 있습니다!
                              </div>
                            )}
                            
                            <details className="mt-2">
                              <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                                상세 결과 보기
                              </summary>
                              <pre className="overflow-x-auto bg-gray-800 text-green-400 p-2 rounded text-xs mt-2">
                                {JSON.stringify(uploadResults['face-image'].data || uploadResults['face-image'].error, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 룸 API 테스트 섹션 */}
                {testApis.map((category) => (
                  <div key={category.category} className="rounded-lg bg-white p-6 shadow-lg">
                    <h2 className="mb-4 text-xl font-semibold text-gray-800">{category.category}</h2>
                    
                    <div className="space-y-4">
                      {category.apis.map((api) => (
                        <div key={api.name} className="border-b border-gray-200 pb-4 last:border-b-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-4">
                              <h3 className="font-medium text-gray-700">{api.title}</h3>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                api.method === 'GET' ? 'bg-green-100 text-green-800' :
                                api.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {api.method}
                              </span>
                              <code className="text-sm text-gray-500">{api.url}</code>
                            </div>
                            
                            <button
                              onClick={() => apiCall(api.name, api.url, api.method, 'body' in api ? api.body : undefined)}
                              disabled={loading[api.name]}
                              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {loading[api.name] ? '테스트 중...' : '테스트'}
                            </button>
                          </div>

                          {results[api.name] && (
                            <div className={`mt-2 rounded p-3 text-sm ${
                              results[api.name].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`font-medium ${
                                  results[api.name].success ? 'text-green-800' : 'text-red-800'
                                }`}>
                                  {results[api.name].success ? '✅ 성공' : '❌ 실패'}
                                </span>
                                <span className="text-gray-500 text-xs">{results[api.name].timestamp}</span>
                              </div>
                              
                              <pre className="overflow-x-auto bg-gray-800 text-green-400 p-2 rounded text-xs">
                                {JSON.stringify(results[api.name].data || results[api.name].error, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Tab.Panel>

            {/* 사진 편집 탭 */}
            <Tab.Panel>
              <div className="space-y-8">
                {/* 그룹 사진 업로드 & 편집 섹션 */}
                <div className="rounded-lg bg-white p-6 shadow-lg">
                  <h2 className="mb-4 text-xl font-semibold text-gray-800">그룹 사진 편집</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    여러 장의 그룹 사진을 업로드하고, 순서를 정하고, 배경을 설정해보세요.
                  </p>
                  
                  <div className="space-y-6">
                    {/* 파일 업로드 섹션 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          그룹 사진 업로드
                        </label>
                        {groupPhotos.length > 0 && (
                          <button
                            onClick={clearAllGroupPhotos}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            전체 삭제
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGroupPhotosSelect}
                        disabled={loading['group-photos']}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        여러 장의 사진을 동시에 선택할 수 있습니다. (type: 'group'으로 업로드)
                      </p>
                      {loading['group-photos'] && (
                        <div className="flex items-center mt-2 text-sm text-blue-600">
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                          업로드 중...
                        </div>
                      )}
                    </div>

                    {/* 업로드된 사진들 그리드 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        업로드된 그룹 사진들 ({groupPhotos.length}장)
                      </label>
                      {groupPhotos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {groupPhotos.map((photoUrl, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={photoUrl}
                                alt={`그룹 사진 ${index + 1}`}
                                className="w-full aspect-square object-cover rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors"
                              />
                              <button
                                onClick={() => deleteGroupPhoto(photoUrl)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              >
                                ×
                              </button>
                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 text-sm py-8 border-2 border-dashed border-gray-300 rounded-lg">
                          아직 업로드된 그룹 사진이 없습니다.
                        </div>
                      )}
                    </div>

                    {/* 그룹 사진 업로드 결과 */}
                    {uploadResults['group-photos'] && (
                      <div className={`rounded p-4 text-sm border-l-4 ${
                        uploadResults['group-photos'].success 
                          ? 'bg-green-50 border-green-400 border-l-green-500' 
                          : 'bg-red-50 border-red-400 border-l-red-500'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-semibold ${
                            uploadResults['group-photos'].success ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {uploadResults['group-photos'].success ? '✅ 그룹 사진 업로드 성공!' : '❌ 그룹 사진 업로드 실패'}
                          </span>
                          <span className="text-gray-500 text-xs">{uploadResults['group-photos'].timestamp}</span>
                        </div>
                        
                        <details className="mt-2">
                          <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                            상세 결과 보기
                          </summary>
                          <pre className="overflow-x-auto bg-gray-800 text-green-400 p-2 rounded text-xs mt-2">
                            {JSON.stringify(uploadResults['group-photos'].data || uploadResults['group-photos'].error, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}

                    {/* 사진 선택 및 순서 정렬 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          사진 선택 및 순서 정렬
                        </label>
                        <div className="flex items-center space-x-4 text-sm">
                          <label className="flex items-center">
                            <span className="mr-2">선택 개수:</span>
                            <input
                              type="number"
                              min="1"
                              max={groupPhotos.length || 1}
                              value={cutCount}
                              onChange={(e) => setCutCount(parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                            />
                          </label>
                          <span className="text-gray-500">
                            ({selectedGroupPhotos.length}/{cutCount} 선택됨)
                          </span>
                        </div>
                      </div>
                      
                      {groupPhotos.length > 0 ? (
                        <PhotoPicker
                          photos={groupPhotos}
                          cutCount={cutCount}
                          selected={selectedGroupPhotos}
                          onSelect={setSelectedGroupPhotos}
                        />
                      ) : (
                        <div className="text-center text-gray-500 text-sm py-8 border-2 border-dashed border-gray-300 rounded-lg">
                          먼저 그룹 사진을 업로드해주세요.
                        </div>
                      )}
                    </div>

                    {/* 프레임 색상 선택 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        프레임 색상 선택
                      </label>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-gray-600">선택된 색상:</span>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-6 h-6 rounded border border-gray-300"
                              style={{ backgroundColor: frameColor }}
                            ></div>
                            <span className="text-sm font-mono">{frameColor}</span>
                          </div>
                        </div>
                        <FrameColorSelector
                          frameColor={frameColor}
                          onFrameColorChange={setFrameColor}
                          palette={frameColorPalette}
                        />
                      </div>
                    </div>

                    {/* 배경 설정 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        배경 설정
                      </label>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        {/* 배경 타입 선택 */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-3">배경 타입</label>
                          <div className="flex space-x-6">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="backgroundType"
                                value="prompt"
                                checked={backgroundType === 'prompt'}
                                onChange={(e) => setBackgroundType(e.target.value as 'prompt' | 'color')}
                                className="mr-2"
                              />
                              <span className="text-sm">🎨 프롬프트 기반</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="backgroundType"
                                value="color"
                                checked={backgroundType === 'color'}
                                onChange={(e) => setBackgroundType(e.target.value as 'prompt' | 'color')}
                                className="mr-2"
                              />
                              <span className="text-sm">🎨 색상 기반</span>
                            </label>
                          </div>
                        </div>

                        {/* 프롬프트 입력 (프롬프트 타입일 때만) */}
                        {backgroundType === 'prompt' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">배경 프롬프트</label>
                            <input
                              type="text"
                              placeholder="예: korean school, beach, mountain, sunset..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={promptText}
                              onChange={(e) => setPromptText(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              AI가 이 프롬프트를 바탕으로 배경을 생성합니다.
                            </p>
                          </div>
                        )}

                        {/* 배경 색상 (색상 타입일 때만) */}
                        {backgroundType === 'color' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">배경 색상</label>
                            <div className="flex items-center space-x-3">
                              <input
                                type="color"
                                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                                value={backgroundColor}
                                onChange={(e) => setBackgroundColor(e.target.value)}
                              />
                              <span className="text-sm font-mono">{backgroundColor}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              선택한 색상으로 단색 배경이 생성됩니다.
                            </p>
                          </div>
                        )}

                        {/* 참가자 순서 설정 */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">참가자 순서 (prettyFaceUrl)</label>
                          <textarea
                            placeholder="사용자들의 prettyFaceUrl을 줄바꿈으로 구분하여 입력하세요..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            value={personOrder.join('\n')}
                            onChange={(e) => setPersonOrder(e.target.value.split('\n').filter(url => url.trim()))}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            각 줄에 하나씩 사용자의 얼굴 사진 URL을 입력하세요. ({personOrder.length}명)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* API 실행 버튼들 */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">처리 실행</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <button
                          onClick={sendPhotoSelection}
                          disabled={loading['photo-selection'] || selectedGroupPhotos.length === 0}
                          className="flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading['photo-selection'] ? (
                            <>
                              <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                              전송 중...
                            </>
                          ) : (
                            <>
                              <span className="mr-2">1️⃣</span>
                              사진 선택 전송
                            </>
                          )}
                        </button>
                        <button
                          onClick={processSelectedPhotos}
                          disabled={loading['background-processing'] || selectedGroupPhotos.length === 0 || personOrder.length === 0}
                          className="flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading['background-processing'] ? (
                            <>
                              <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                              처리 중...
                            </>
                          ) : (
                            <>
                              <span className="mr-2">2️⃣</span>
                              배경 처리 실행
                            </>
                          )}
                        </button>
                      </div>
                      
                      {/* 실행 전 체크리스트 */}
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                        <h4 className="font-medium text-yellow-800 mb-2">실행 전 체크리스트:</h4>
                        <ul className="space-y-1 text-yellow-700">
                          <li className={`flex items-center ${selectedGroupPhotos.length > 0 ? 'text-green-600' : ''}`}>
                            <span className="mr-2">{selectedGroupPhotos.length > 0 ? '✅' : '❌'}</span>
                            사진 선택 ({selectedGroupPhotos.length}/{cutCount})
                          </li>
                          <li className={`flex items-center ${frameColor ? 'text-green-600' : ''}`}>
                            <span className="mr-2">✅</span>
                            프레임 색상 선택 ({frameColor})
                          </li>
                          <li className={`flex items-center ${personOrder.length > 0 ? 'text-green-600' : ''}`}>
                            <span className="mr-2">{personOrder.length > 0 ? '✅' : '❌'}</span>
                            참가자 순서 ({personOrder.length}명)
                          </li>
                          <li className={`flex items-center ${(backgroundType === 'prompt' && promptText.trim()) || (backgroundType === 'color' && backgroundColor) ? 'text-green-600' : ''}`}>
                            <span className="mr-2">{(backgroundType === 'prompt' && promptText.trim()) || (backgroundType === 'color' && backgroundColor) ? '✅' : '❌'}</span>
                            배경 설정 ({backgroundType === 'prompt' ? `프롬프트: "${promptText}"` : `색상: ${backgroundColor}`})
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* 처리 결과 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API 처리 결과
                      </label>
                      
                      {/* 사진 선택 결과 */}
                      {processingResults['photo-selection'] && (
                        <div className={`mb-4 rounded p-4 text-sm border-l-4 ${
                          processingResults['photo-selection'].success 
                            ? 'bg-blue-50 border-blue-400 border-l-blue-500' 
                            : 'bg-red-50 border-red-400 border-l-red-500'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-semibold ${
                              processingResults['photo-selection'].success ? 'text-blue-800' : 'text-red-800'
                            }`}>
                              1️⃣ {processingResults['photo-selection'].success ? '사진 선택 전송 성공' : '사진 선택 전송 실패'}
                            </span>
                            <span className="text-gray-500 text-xs">{processingResults['photo-selection'].timestamp}</span>
                          </div>
                          
                          <details className="mt-2">
                            <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                              상세 결과 보기
                            </summary>
                            <pre className="overflow-x-auto bg-gray-800 text-green-400 p-2 rounded text-xs mt-2">
                              {JSON.stringify(processingResults['photo-selection'].data || processingResults['photo-selection'].error, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}

                      {/* 배경 처리 결과 */}
                      {processingResults['background-processing'] && (
                        <div className={`mb-4 rounded p-4 text-sm border-l-4 ${
                          processingResults['background-processing'].success 
                            ? 'bg-green-50 border-green-400 border-l-green-500' 
                            : 'bg-red-50 border-red-400 border-l-red-500'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-semibold ${
                              processingResults['background-processing'].success ? 'text-green-800' : 'text-red-800'
                            }`}>
                              2️⃣ {processingResults['background-processing'].success ? '배경 처리 완료' : '배경 처리 실패'}
                            </span>
                            <span className="text-gray-500 text-xs">{processingResults['background-processing'].timestamp}</span>
                          </div>
                          
                          {processingResults['background-processing'].success && (
                            <div className="text-green-700 text-sm mb-2">
                              🎉 {processingResults['background-processing'].data?.totalProcessed}장의 사진이 처리되었습니다!
                            </div>
                          )}
                          
                          <details className="mt-2">
                            <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                              상세 결과 보기
                            </summary>
                            <pre className="overflow-x-auto bg-gray-800 text-green-400 p-2 rounded text-xs mt-2">
                              {JSON.stringify(processingResults['background-processing'].data || processingResults['background-processing'].error, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}

                      {/* 결과 없음 */}
                      {Object.keys(processingResults).length === 0 && (
                        <div className="text-center text-gray-500 text-sm py-8 border-2 border-dashed border-gray-300 rounded-lg">
                          API 처리 결과가 여기에 표시됩니다.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  )
}