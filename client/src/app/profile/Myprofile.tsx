'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import { User } from '@/types/auth'
import { 
  UserIcon, 
  CameraIcon, 
  CogIcon, 
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

// LoadingSpinner 컴포넌트
const LoadingSpinner = ({ size = 'md', className = '', text }: { 
  size?: 'sm' | 'md' | 'lg'; 
  className?: string;
  text?: string;
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`} />
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );
};

interface MyProfileProps {
  user?: User | null
}

const MyProfile: React.FC<MyProfileProps> = ({ user }) => {
  const router = useRouter()
  const { handleLogout, handleDeleteAccount } = useAuth()
  
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [loading, setLoading] = useState({
    logout: false,
    delete: false
  })

  // 🚀 로그아웃 핸들러
  const handleLogoutClick = async () => {
    if (confirm('로그아웃하시겠습니까?')) {
      try {
        setLoading(prev => ({ ...prev, logout: true }))
        await handleLogout()
        router.push('/')
      } catch (error) {
        console.error('로그아웃 실패:', error)
        alert('로그아웃에 실패했습니다.')
      } finally {
        setLoading(prev => ({ ...prev, logout: false }))
      }
    }
  }

  // 🚀 계정 삭제 핸들러
  const handleDeleteAccountClick = async () => {
    const confirmMsg1 = '정말로 계정을 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.'
    const confirmMsg2 = '모든 게시물, 팔로우 관계, 개인 정보가 영구적으로 삭제됩니다.\n\n정말로 계속하시겠습니까?'
    
    if (confirm(confirmMsg1)) {
      if (confirm(confirmMsg2)) {
        try {
          setLoading(prev => ({ ...prev, delete: true }))
          await handleDeleteAccount()
          alert('계정이 성공적으로 삭제되었습니다.')
          router.push('/')
        } catch (error) {
          console.error('계정 삭제 실패:', error)
          alert('계정 삭제에 실패했습니다.')
        } finally {
          setLoading(prev => ({ ...prev, delete: false }))
        }
      }
    }
  }

  // 🚀 MyRoom으로 이동 (셀피 업로드/AI 보정)
  const handleUploadSelfie = () => {
    router.push('/myroom')
  }

  // 🚀 프로필 설정 페이지로 이동
  const handleAccount = () => {
    router.push('/profile')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">사용자 정보를 불러올 수 없습니다</h2>
          <p className="text-gray-500 mb-6">로그인 상태를 확인해주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔥 상단 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-900">My Profile</h1>
            <p className="text-xs text-gray-500">
              사용자 ID: {user.id} • {user.name || user.email}
            </p>
          </div>
          
          {/* 우측 상단 프로필 및 햄버거 메뉴 */}
          <div className="flex items-center space-x-2">
            {/* 프로필 원형 아바타 - 소셜 계정 프로필 사진과 연결 */}
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 shadow-md">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt="프로필 사진"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const fallback = target.nextElementSibling as HTMLElement
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
              ) : null}
              {/* Fallback: 프로필 이미지가 없을 때 이니셜 표시 */}
              <div 
                className={`w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center ${
                  user.profileImage ? 'hidden' : 'flex'
                }`}
              >
                <span className="text-white text-sm font-bold">
                  {user.name ? user.name.charAt(0).toUpperCase() : 
                   user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
            </div>
            
            {/* 햄버거 메뉴 */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors focus:outline-none"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Dropdown Menu - MainPage와 동일한 구조 */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-2">
                    {/* UPLOAD SELFIE */}
                    <button
                      onClick={() => {
                        handleUploadSelfie()
                        setIsMenuOpen(false)
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 text-gray-800 border-b border-gray-100"
                    >
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <p className="font-medium">UPLOAD SELFIE</p>
                        <p className="text-xs text-gray-500">AI 프로필 이미지 생성</p>
                      </div>
                    </button>
                    
                    {/* ACCOUNT */}
                    <button
                      onClick={() => {
                        handleAccount()
                        setIsMenuOpen(false)
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-gray-800 border-b border-gray-100"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <div>
                        <p className="font-medium">ACCOUNT</p>
                        <p className="text-xs text-gray-500">프로필 설정 및 관리</p>
                      </div>
                    </button>
                    
                    {/* LOGOUT - 빨간색 */}
                    <button
                      onClick={() => {
                        handleLogoutClick()
                        setIsMenuOpen(false)
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors flex items-center gap-3 text-red-600"
                    >
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <div>
                        <p className="font-medium">LOGOUT</p>
                        <p className="text-xs text-red-500">현재 기기에서 로그아웃</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* 🔥 프로필 사진 섹션 (SideList에서 가져온 내용) */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CameraIcon className="h-5 w-5 mr-2" />
            프로필 사진
          </h2>
          <div className="flex items-center space-x-6">
            <div className="relative">
              {/* SideList에서 가져온 프로필 이미지 스타일 */}
              <div className="w-24 h-24 rounded-full bg-slate-700 ring-2 ring-slate-600 overflow-hidden">
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name || 'Profile'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <UserIcon className="h-12 w-12" />
                  </div>
                )}
              </div>
              {/* 온라인 상태 표시 (SideList에서 가져온 스타일) */}
              <div className="absolute -right-1 -bottom-1 h-5 w-5 rounded-full ring-2 ring-white bg-green-500"></div>
            </div>
            
            <div className="flex-1">
              {/* SideList에서 가져온 사용자 정보 표시 */}
              <h3 className="font-medium text-gray-900">{user.name || '사용자'}</h3>
              <p className="text-sm text-gray-500 mb-1">{user.email}</p>
              <div className="space-y-2">
                <button
                  onClick={handleUploadSelfie}
                  className="block text-blue-600 text-sm hover:text-blue-700 font-medium transition-colors"
                >
                  📸 MyRoom에서 셀피 촬영하기
                </button>
                <p className="text-xs text-gray-500">
                  셀피를 촬영하면 AI가 자동으로 프로필 이미지를 생성합니다
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 기본 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            기본 정보
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                {user.name || '이름 없음'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                {user.email || '이메일 없음'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사용자 ID
              </label>
              <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 font-mono">
                {user.id}
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 계정 관리 섹션 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ShieldExclamationIcon className="h-5 w-5 mr-2" />
            계정 관리
          </h2>
          <div className="space-y-3">
            <button
              onClick={handleLogoutClick}
              disabled={loading.logout}
              className="w-full p-4 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between disabled:opacity-50"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <div>
                  <p className="font-medium">로그아웃</p>
                  <p className="text-xs text-gray-500">현재 기기에서 로그아웃합니다</p>
                </div>
              </div>
              {loading.logout && <LoadingSpinner size="sm" />}
            </button>
            
            <button
              onClick={handleDeleteAccountClick}
              disabled={loading.delete}
              className="w-full p-4 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-between disabled:opacity-50"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <div>
                  <p className="font-medium">계정 삭제</p>
                  <p className="text-xs text-red-500">모든 데이터가 영구적으로 삭제됩니다</p>
                </div>
              </div>
              {loading.delete && <LoadingSpinner size="sm" />}
            </button>
          </div>
          
          {/* 🔥 계정 삭제 경고 */}
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium text-sm mb-1">계정 삭제 시 주의사항</p>
                <ul className="text-red-700 text-xs space-y-1">
                  <li>• 모든 게시물과 사진이 영구적으로 삭제됩니다</li>
                  <li>• 팔로우/팔로워 관계가 모두 해제됩니다</li>
                  <li>• 계정 정보와 개인 데이터가 복구 불가능하게 삭제됩니다</li>
                  <li>• 이 작업은 되돌릴 수 없습니다</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 추가 기능 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-800 font-medium text-sm mb-2">💡 추가 기능</h3>
          <div className="space-y-2 text-blue-700 text-xs">
            <button
              onClick={handleUploadSelfie}
              className="block w-full text-left p-2 hover:bg-blue-100 rounded transition-colors"
            >
              📸 <strong>MyRoom</strong>에서 셀피를 촬영하여 AI 프로필 이미지 생성
            </button>
            <button
              onClick={() => router.push('/my')}
              className="block w-full text-left p-2 hover:bg-blue-100 rounded transition-colors"
            >
              👤 <strong>내 페이지</strong>에서 피드와 게시물 관리
            </button>
            <button
              onClick={() => router.push('/feeds/timeline')}
              className="block w-full text-left p-2 hover:bg-blue-100 rounded transition-colors"
            >
              🏠 <strong>타임라인</strong>에서 팔로잉 사용자들의 최신 게시물 확인
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default MyProfile
