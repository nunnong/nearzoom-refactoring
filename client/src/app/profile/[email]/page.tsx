'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import MyRoomHeader from '@/components/page/myroom/MyRoomHeader'
import UserProfile from '@/components/page/profile/UserProfile'

// 다른 사용자의 프로필 페이지 컴포넌트
const OtherUserProfilePage: React.FC = () => {
  const router = useRouter()
  const params = useParams()
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuthStore()
  
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isMyProfile, setIsMyProfile] = useState(false)
  const [profileCheckDone, setProfileCheckDone] = useState(false)

  // URL에서 userEmail 추출 및 디코딩
  useEffect(() => {
    if (params?.email) {
      const decodedEmail = decodeURIComponent(params.email as string)
      setUserEmail(decodedEmail)
      
      console.log('🔍 동적 라우팅 - userEmail 추출:', {
        original: params.email,
        decoded: decodedEmail
      })
    }
  }, [params])

  // 본인 프로필인지 확인
  useEffect(() => {
    if (!userEmail || authLoading) {
      setProfileCheckDone(false)
      return
    }

    // 인증된 사용자만 서비스 이용 가능 - 인증 체크 필수
    if (!isAuthenticated || !currentUser) {
      console.log('❌ 인증되지 않은 사용자 - 서비스 이용 불가')
      setProfileCheckDone(false)
      return
    }

    const currentUserEmail = currentUser.email || ''
    
    // 이메일이 일치하면 내 프로필
    const isMyProfileCheck = currentUserEmail === userEmail
    
    console.log('🔍 본인 프로필 확인:', {
      userEmail,
      currentUserEmail,
      isMyProfile: isMyProfileCheck
    })

    if (isMyProfileCheck) {
      console.log('✅ 본인 프로필 감지 - /my로 리다이렉트')
      router.replace('/my')
      return
    }

    setIsMyProfile(false)
    setProfileCheckDone(true)
  }, [userEmail, isAuthenticated, currentUser, authLoading, router])

  // 로딩 상태 - 인증 로딩 중
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MyRoomHeader
          onUploadSelfie={() => router.push('/upload-photo')}
          onLogout={() => router.push('/')}
          onDeleteAccount={() => router.push('/profile')}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">인증 확인 중...</p>
          </div>
        </div>
      </div>
    )
  }

  // userEmail이 아직 없으면 로딩
  if (!userEmail) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MyRoomHeader
          onUploadSelfie={() => router.push('/upload-photo')}
          onLogout={() => router.push('/')}
          onDeleteAccount={() => router.push('/profile')}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">프로필을 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  // 프로필 확인이 완료되지 않았으면 로딩
  if (!profileCheckDone) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MyRoomHeader
          onUploadSelfie={() => router.push('/upload-photo')}
          onLogout={() => router.push('/')}
          onDeleteAccount={() => router.push('/profile')}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">프로필 정보 확인 중...</p>
          </div>
        </div>
      </div>
    )
  }

  // 본인 프로필인 경우는 이미 /my로 리다이렉트됨
  if (isMyProfile) {
    return <></>
  }

  // 다른 사용자 프로필 표시
  return (
    <div className="min-h-screen bg-gray-50">
      <MyRoomHeader
        onUploadSelfie={() => router.push('/upload-photo')}
        onLogout={() => router.push('/')}
        onDeleteAccount={() => router.push('/profile')}
      />
      
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <UserProfile
            params={{ accountName: userEmail }}
            postsPerPage={12}
            enableAutoLoad={true}
            className="max-w-4xl mx-auto"
          />
        </div>
      </div>
    </div>
  )
}

export default OtherUserProfilePage
