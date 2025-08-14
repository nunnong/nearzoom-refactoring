'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  CogIcon,
  UserCircleIcon,
  CameraIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

// ============================================================================
// 🔥 백엔드 API 연동 - 정확한 타입 정의
// ============================================================================
import api from '@/lib/axios'

// 백엔드 API 응답 타입
interface ApiResponse<T> {
  error: boolean
  message: string
  data: T
}

// 🔥 수정: 백엔드 User 엔티티 기반 정확한 타입
interface UserProfileResponse {
  userId: number
  userName: string
  userEmail: string
  accountName: string
  profileImage: string | null
  prettyFace: string | null
  socialType: string
  createdAt: string
  updatedAt: string
}

// 🔥 수정: 백엔드에서 실제로 지원하는 업데이트 필드만 포함
interface UpdateProfileRequest {
  userName: string
  // accountName과 userEmail은 수정 불가능할 수 있으므로 백엔드 API 확인 필요
  // 현재는 기본적으로 userName만 수정 가능하다고 가정
}

// LoadingSpinner 컴포넌트
const LoadingSpinner = ({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]} ${className}`} />
  );
};

// ============================================================================
// 🔥 백엔드 API 함수들 - 실제 User 도메인 API 사용
// ============================================================================

// 🔥 현재 사용자 프로필 조회 (UserController의 API 사용)
const getUserProfile = async (): Promise<UserProfileResponse> => {
  try {
    // 실제 백엔드에서 현재 사용자 프로필을 가져오는 API 엔드포인트
    // Authentication을 통해 현재 로그인한 사용자 정보를 가져옴
    const response = await api.get<ApiResponse<UserProfileResponse>>('/users/me')
    
    if (response.data.error) {
      throw new Error(response.data.message)
    }
    
    return response.data.data
  } catch (error: any) {
    console.error('Failed to fetch user profile:', error)
    throw error
  }
}

// 🔥 프로필 정보 업데이트 (UserController의 updateProfile API 사용)
const updateProfile = async (profileData: UpdateProfileRequest): Promise<UserProfileResponse> => {
  try {
    const response = await api.put<ApiResponse<UserProfileResponse>>('/users/me', profileData)
    
    if (response.data.error) {
      throw new Error(response.data.message)
    }
    
    return response.data.data
  } catch (error: any) {
    console.error('Failed to update profile:', error)
    throw error
  }
}

// 🔥 로그아웃 (AuthController의 logout API 사용)
const logoutUser = async (): Promise<void> => {
  try {
    await api.post<ApiResponse<void>>('/auth/logout')
  } catch (error: any) {
    console.error('Failed to logout:', error)
    // 로그아웃은 클라이언트 측에서도 처리되므로 에러를 던지지 않음
  }
}

// 🔥 계정 삭제 (UserController의 deleteAccount API 사용)
const deleteAccount = async (): Promise<void> => {
  try {
    await api.delete<ApiResponse<void>>('/users/me')
  } catch (error: any) {
    console.error('Failed to delete account:', error)
    throw error
  }
}

const ProfileSettingsPage: React.FC = () => {
  const { user: currentUser, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // 🔥 수정: 실제로 수정 가능한 필드만 관리
  const [editForm, setEditForm] = useState({
    userName: ''
  })

  // ============================================================================
  // 🔥 백엔드 데이터 로딩
  // ============================================================================

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!isAuthenticated) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // 백엔드에서 현재 사용자 프로필 조회
        const profile = await getUserProfile()
        setUserProfile(profile)
        
        // 편집 폼 초기화
        setEditForm({
          userName: profile.userName
        })

        console.log('사용자 프로필 로드 완료:', profile)

      } catch (error: any) {
        console.error('사용자 프로필 로드 실패:', error)
        
        // 백엔드 에러 메시지 처리
        let errorMessage = '프로필을 불러오는데 실패했습니다.'
        if (error?.response?.status === 401) {
          errorMessage = '로그인이 필요합니다.'
          logout()
          router.push('/login')
          return
        } else if (error?.response?.status === 403) {
          errorMessage = '프로필에 접근할 권한이 없습니다.'
        } else if (error?.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error?.message) {
          errorMessage = error.message
        }
        
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserProfile()
  }, [isAuthenticated, logout, router])

  // ============================================================================
  // 🔥 이벤트 핸들러들
  // ============================================================================

  const handleBack = () => {
    router.back()
  }

  // 폼 입력 핸들러
  const handleInputChange = (field: keyof typeof editForm, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }))
    
    // 입력 시 에러 메시지 클리어
    if (error) {
      setError(null)
    }
  }

  // 🔥 수정: 백엔드 API에 맞춘 프로필 저장
  const handleSaveProfile = async () => {
    if (!userProfile) return

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const updateData: UpdateProfileRequest = {
        userName: editForm.userName.trim()
      }

      // 유효성 검사
      if (!updateData.userName) {
        throw new Error('이름을 입력해주세요.')
      }

      // 백엔드 API 호출
      const updatedProfile = await updateProfile(updateData)
      
      setUserProfile(updatedProfile)
      setSuccessMessage('프로필이 성공적으로 업데이트되었습니다.')
      
      console.log('프로필 업데이트 완료:', updatedProfile)
      
      // 3초 후 성공 메시지 제거
      setTimeout(() => setSuccessMessage(null), 3000)

    } catch (error: any) {
      console.error('프로필 저장 실패:', error)
      
      let errorMessage = '프로필 저장에 실패했습니다.'
      if (error?.response?.status === 400) {
        errorMessage = '입력한 정보가 올바르지 않습니다.'
      } else if (error?.response?.status === 409) {
        errorMessage = '이미 사용 중인 이름입니다.'
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  // 변경사항 취소
  const handleCancelEdit = () => {
    if (userProfile) {
      setEditForm({
        userName: userProfile.userName
      })
    }
    setError(null)
    setSuccessMessage(null)
  }

  // 🔥 로그아웃 핸들러 (백엔드 연동)
  const handleLogout = async () => {
    if (confirm('로그아웃하시겠습니까?')) {
      try {
        // 백엔드 로그아웃 API 호출
        await logoutUser()
        
        // 클라이언트 측 로그아웃 처리
        logout()
        
        // 로그인 페이지로 이동
        router.push('/login')
        
        console.log('로그아웃 완료')
        
      } catch (error: any) {
        console.error('로그아웃 실패:', error)
        
        // 백엔드 에러가 있어도 클라이언트 측 로그아웃은 진행
        logout()
        router.push('/login')
      }
    }
  }

  // 🔥 계정 삭제 핸들러 (백엔드 연동)
  const handleDeleteAccount = async () => {
    if (confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      if (confirm('모든 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?')) {
        try {
          // 백엔드 계정 삭제 API 호출
          await deleteAccount()
          
          // 클라이언트 측 정리
          logout()
          
          // 로그인 페이지로 이동
          router.push('/login')
          
          alert('계정이 성공적으로 삭제되었습니다.')
          
          console.log('계정 삭제 완료')
          
        } catch (error: any) {
          console.error('계정 삭제 실패:', error)
          
          let errorMessage = '계정 삭제에 실패했습니다.'
          if (error?.response?.data?.message) {
            errorMessage = error.response.data.message
          } else if (error?.message) {
            errorMessage = error.message
          }
          
          alert(errorMessage)
        }
      }
    }
  }

  // MyRoom으로 이동 (셀피 업로드)
  const handleUploadSelfie = () => {
    router.push('/myroom')
  }

  // 변경사항이 있는지 확인
  const hasChanges = userProfile && (
    editForm.userName !== userProfile.userName
  )

  // ============================================================================
  // 🔥 렌더링 조건부 처리
  // ============================================================================

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">프로필을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error && !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-4">
            <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={() => router.push('/my')}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              내 피드로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 인증되지 않은 상태
  if (!isAuthenticated || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-4">
            <svg className="w-16 h-16 text-blue-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-6">프로필 설정을 하려면 로그인해주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          
          <h1 className="text-lg font-semibold text-gray-900">프로필 설정</h1>
          
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="p-2 rounded-full hover:bg-green-100 transition-colors text-green-600 disabled:opacity-50"
                >
                  {isSaving ? <LoadingSpinner size="sm" /> : <CheckIcon className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* 성공/에러 메시지 */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* 프로필 사진 섹션 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">프로필 사진</h2>
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-300 overflow-hidden">
                {userProfile.profileImage ? (
                  <img
                    src={userProfile.profileImage}
                    alt={userProfile.userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                    {userProfile.userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <button
                onClick={handleUploadSelfie}
                className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              >
                <CameraIcon className="w-4 h-4" />
              </button>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">{userProfile.userName}</h3>
              <p className="text-sm text-gray-500 mb-2">@{userProfile.accountName}</p>
              <button
                onClick={handleUploadSelfie}
                className="text-blue-600 text-sm hover:text-blue-700 font-medium"
              >
                사진 변경하기
              </button>
            </div>
          </div>

          {/* AI 보정 이미지 */}
          {userProfile.prettyFace && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">AI 보정 이미지</h3>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={userProfile.prettyFace}
                    alt="AI 보정된 얼굴"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-600">AI가 보정한 얼굴 이미지</p>
                  <button
                    onClick={handleUploadSelfie}
                    className="text-blue-600 text-sm hover:text-blue-700 font-medium"
                  >
                    새로 생성하기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 기본 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
          <div className="space-y-4">
            {/* 이름 */}
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <input
                type="text"
                id="userName"
                value={editForm.userName}
                onChange={(e) => handleInputChange('userName', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="이름을 입력하세요"
                maxLength={50}
              />
            </div>

            {/* 🔥 수정: 읽기 전용 필드들 */}
            {/* 계정명 (읽기 전용) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                계정명
              </label>
              <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                @{userProfile.accountName}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                계정명은 변경할 수 없습니다.
              </p>
            </div>

            {/* 이메일 (읽기 전용) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                {userProfile.userEmail}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                소셜 로그인 계정의 이메일은 변경할 수 없습니다.
              </p>
            </div>
          </div>

          {/* 저장 버튼 (변경사항이 있을 때만 표시) */}
          {hasChanges && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                >
                  {isSaving ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2 inline" />
                      저장 중...
                    </>
                  ) : (
                    '변경사항 저장'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 계정 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">계정 정보</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">사용자 ID</span>
              <span className="font-medium">{userProfile.userId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">소셜 로그인</span>
              <span className="font-medium capitalize">{userProfile.socialType}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">가입일</span>
              <span className="font-medium">
                {new Date(userProfile.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">마지막 수정</span>
              <span className="font-medium">
                {new Date(userProfile.updatedAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
          </div>
        </div>

        {/* 계정 관리 섹션 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">계정 관리</h2>
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full p-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              로그아웃
            </button>
            <button
              onClick={handleDeleteAccount}
              className="w-full p-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              계정 삭제
            </button>
          </div>
          
          {/* 계정 삭제 경고 */}
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">
              ⚠️ 계정 삭제 시 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ProfileSettingsPage