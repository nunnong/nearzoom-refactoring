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
// 🔥 백엔드 연동 타입 정의
// ============================================================================

interface UserInfoResponse {
  userName: string
  userEmail: string
  userProfileImage: string
  faceImageUrl: string
}

interface ExtendedUser {
  id: number
  name: string
  email: string
  profileImage?: string
  accountName: string
  faceImageUrl?: string
  socialType: string
  createdAt: string
  updatedAt: string
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

const ProfileSettingsPage: React.FC = () => {
  const { user: currentUser, isAuthenticated } = useAuth()
  const router = useRouter()
  
  const [userProfile, setUserProfile] = useState<ExtendedUser | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // 편집 가능한 필드들
  const [editForm, setEditForm] = useState({
    userName: '',
    accountName: '',
    userEmail: ''
  })

  // ============================================================================
  // 🔥 백엔드 API 호출 함수들
  // ============================================================================

  // 현재 사용자 정보 조회
  const getUserInfo = async (): Promise<UserInfoResponse> => {
    const response = await fetch('/api/user/userInfo', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (!response.ok) {
      throw new Error('사용자 정보를 가져오는데 실패했습니다.')
    }
    
    const data = await response.json()
    return data.data
  }

  // 현재 사용자 기본 정보 조회
  const getCurrentUser = async () => {
    const response = await fetch('/api/user/current', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (!response.ok) {
      throw new Error('사용자 기본 정보를 가져오는데 실패했습니다.')
    }
    
    const data = await response.json()
    return data.data
  }

  // 프로필 정보 업데이트 (TODO: 백엔드 API 구현 필요)
  const updateProfile = async (profileData: Partial<ExtendedUser>): Promise<void> => {
    const response = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    })
    
    if (!response.ok) {
      throw new Error('프로필 업데이트에 실패했습니다.')
    }
  }

  // 로그아웃
  const logoutUser = async (): Promise<void> => {
    const response = await fetch('/api/user/logout', { 
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (!response.ok) {
      throw new Error('로그아웃에 실패했습니다.')
    }

    // 클라이언트 측 정리
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      
      try {
        const { useAuthStore } = await import('@/stores/authStore')
        useAuthStore.getState().clearTokens()
      } catch (error) {
        console.warn('Auth store 정리 실패:', error)
      }
      
      document.cookie = 'JSESSIONID=; Max-Age=0; path=/;'
      document.cookie = 'RefreshToken=; Max-Age=0; path=/;'
    }
  }

  // ============================================================================
  // 데이터 로딩
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

        // 사용자 정보 조회
        const [userInfoResult, currentUserResult] = await Promise.all([
          getUserInfo(),
          getCurrentUser()
        ])
        
        if (!currentUserResult) {
          throw new Error('사용자 인증 정보를 찾을 수 없습니다.')
        }

        // 통합된 사용자 프로필 생성
        const profile: ExtendedUser = {
          id: parseInt(currentUserResult.id) || 0,
          name: userInfoResult.userName,
          email: userInfoResult.userEmail,
          profileImage: userInfoResult.userProfileImage || undefined,
          socialType: currentUser?.socialType || 'KAKAO',
          createdAt: currentUser?.createdAt || new Date().toISOString(),
          updatedAt: currentUser?.updatedAt || new Date().toISOString(),
          accountName: currentUserResult.accountName,
          faceImageUrl: userInfoResult.faceImageUrl || undefined
        }

        setUserProfile(profile)
        
        // 편집 폼 초기화
        setEditForm({
          userName: profile.name,
          accountName: profile.accountName,
          userEmail: profile.email
        })

      } catch (error) {
        console.error('사용자 프로필 로드 실패:', error)
        setError(error instanceof Error ? error.message : '프로필을 불러오는데 실패했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    loadUserProfile()
  }, [isAuthenticated, currentUser])

  // ============================================================================
  // 이벤트 핸들러들
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
  }

  // 프로필 저장
  const handleSaveProfile = async () => {
    if (!userProfile) return

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const updateData = {
        ...userProfile,
        name: editForm.userName,
        accountName: editForm.accountName,
        email: editForm.userEmail
      }

      await updateProfile(updateData)
      
      setUserProfile(updateData)
      setSuccessMessage('프로필이 성공적으로 업데이트되었습니다.')
      
      // 3초 후 성공 메시지 제거
      setTimeout(() => setSuccessMessage(null), 3000)

    } catch (error) {
      console.error('프로필 저장 실패:', error)
      setError(error instanceof Error ? error.message : '프로필 저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // 변경사항 취소
  const handleCancelEdit = () => {
    if (userProfile) {
      setEditForm({
        userName: userProfile.name,
        accountName: userProfile.accountName,
        userEmail: userProfile.email
      })
    }
    setError(null)
    setSuccessMessage(null)
  }

  // 로그아웃 핸들러
  const handleLogout = async () => {
    if (confirm('로그아웃하시겠습니까?')) {
      try {
        await logoutUser()
        router.push('/login')
      } catch (error) {
        console.error('로그아웃 실패:', error)
        alert('로그아웃에 실패했습니다.')
      }
    }
  }

  // 계정 삭제 핸들러 (TODO: 백엔드 API 구현 필요)
  const handleDeleteAccount = async () => {
    if (confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      if (confirm('모든 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?')) {
        try {
          // TODO: 계정 삭제 API 호출
          alert('계정 삭제 기능은 준비 중입니다.')
        } catch (error) {
          console.error('계정 삭제 실패:', error)
          alert('계정 삭제에 실패했습니다.')
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
    editForm.userName !== userProfile.name ||
    editForm.accountName !== userProfile.accountName ||
    editForm.userEmail !== userProfile.email
  )

  // ============================================================================
  // 렌더링 조건부 처리
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
                    alt={userProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                    {userProfile.name.charAt(0).toUpperCase()}
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
              <h3 className="font-medium text-gray-900">{userProfile.name}</h3>
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
          {userProfile.faceImageUrl && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">AI 보정 이미지</h3>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={userProfile.faceImageUrl}
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
              />
            </div>

            {/* 계정명 */}
            <div>
              <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-1">
                계정명
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">@</span>
                <input
                  type="text"
                  id="accountName"
                  value={editForm.accountName}
                  onChange={(e) => handleInputChange('accountName', e.target.value)}
                  className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="계정명을 입력하세요"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                계정명은 다른 사용자들이 나를 찾을 때 사용됩니다.
              </p>
            </div>

            {/* 이메일 */}
            <div>
              <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                id="userEmail"
                value={editForm.userEmail}
                onChange={(e) => handleInputChange('userEmail', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="이메일을 입력하세요"
              />
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
              <span className="text-gray-600">소셜 로그인</span>
              <span className="font-medium">{userProfile.socialType}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">가입일</span>
              <span className="font-medium">
                {new Date(userProfile.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">마지막 수정</span>
              <span className="font-medium">
                {new Date(userProfile.updatedAt).toLocaleDateString()}
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
              className="w-full p-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              로그아웃
            </button>
            <button
              onClick={handleDeleteAccount}
              className="w-full p-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              계정 삭제
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ProfileSettingsPage