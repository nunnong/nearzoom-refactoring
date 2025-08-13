'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon, UserIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

// 🔥 올바른 백엔드 연동 - api from '@/lib/axios' 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 연동 타입 정의
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T;
}

// 프로필 업데이트 요청 DTO (백엔드에 맞춰 조정 필요)
interface UpdateProfileRequest {
  userName?: string;        // User.userName 필드
  accountName?: string;     // User.accountName 필드  
  // description은 User 엔티티에 없으므로 추가 필요하거나 다른 필드 사용
}

// 사용자 정보 응답 타입
interface UserProfileResponse {
  userId: number;
  userName: string;
  userEmail: string;
  accountName: string;
  profileImage: string;
  // description?: string; // 백엔드에 추가 필요시
}

interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
  currentName: string        // User.userName 또는 accountName
  currentDescription: string // 임시 필드 (백엔드 확장 필요)
  profileImage?: string
  onSave: (data: { name: string; description: string }) => void
}

// ============================================================================
// 백엔드 API 함수들
// ============================================================================

const profileAPI = {
  // PUT /users/profile - 프로필 업데이트 (엔드포인트는 실제 백엔드에 맞춰 조정)
  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfileResponse> => {
    try {
      // 실제 백엔드 API 엔드포인트로 교체 필요
      const response = await api.put<ApiResponse<UserProfileResponse>>('/users/profile', data);
      return response.data.data;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw new Error('프로필 업데이트에 실패했습니다.');
    }
  },

  // GET /users/me - 현재 사용자 정보 조회 (필요시)
  getCurrentUser: async (): Promise<UserProfileResponse> => {
    try {
      const response = await api.get<ApiResponse<UserProfileResponse>>('/users/me');
      return response.data.data;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw new Error('사용자 정보를 불러올 수 없습니다.');
    }
  }
};

// ============================================================================
// ProfileEditModal 컴포넌트
// ============================================================================

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  currentName,
  currentDescription,
  profileImage,
  onSave
}) => {
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [name, setName] = useState(currentName)
  const [description, setDescription] = useState(currentDescription)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // 초기화
  // ============================================================================

  // 모달이 열릴 때마다 현재 값으로 초기화
  useEffect(() => {
    if (isOpen) {
      setName(currentName)
      setDescription(currentDescription)
      setError(null)
    }
  }, [isOpen, currentName, currentDescription])

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        handleCancel()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden' // 스크롤 방지
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, isLoading])

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 🔥 백엔드 연동 - 프로필 저장
  const handleSave = async () => {
    if (!name.trim()) {
      setError('계정명을 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 백엔드 API 호출
      const updateData: UpdateProfileRequest = {
        userName: name.trim(),      // 또는 accountName으로 변경
        accountName: name.trim(),   // 실제 백엔드 필드에 맞춰 조정
        // description은 User 엔티티에 없으므로 주석 처리
        // description: description.trim()
      }

      const updatedProfile = await profileAPI.updateProfile(updateData)
      
      // 부모 컴포넌트에 업데이트된 데이터 전달
      onSave({
        name: updatedProfile.userName || updatedProfile.accountName,
        description: description.trim() // 임시로 로컬 값 사용
      })
      
      // 성공 시 모달 닫기
      onClose()
      
    } catch (err) {
      console.error('프로필 업데이트 실패:', err)
      const errorMessage = err instanceof Error ? err.message : '프로필 업데이트에 실패했습니다.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 취소 핸들러
  const handleCancel = () => {
    if (isLoading) return

    // 변경사항이 있으면 확인
    if (name !== currentName || description !== currentDescription) {
      if (window.confirm('변경사항이 저장되지 않습니다. 정말 닫으시겠습니까?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  // ============================================================================
  // 유효성 검사
  // ============================================================================

  const canSave = !!(name.trim() && !isLoading)

  // ============================================================================
  // 렌더링
  // ============================================================================

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">프로필 편집</h2>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 모달 컨텐츠 */}
        <div className="p-6 space-y-6">
          {/* 프로필 사진 (읽기 전용) */}
          <div className="text-center">
            <div className="relative inline-block">
              <img
                src={profileImage || '/api/placeholder/100/100'}
                alt="프로필 사진"
                className="w-24 h-24 rounded-full mx-auto border-4 border-gray-200 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/api/placeholder/100/100?text=Profile';
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 rounded-full flex items-center justify-center">
                {/* 프로필 사진은 수정 불가 표시 */}
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              프로필 사진은 소셜 로그인 계정의 사진이 사용됩니다
            </p>
          </div>

          {/* 계정명 입력 */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="w-4 h-4 mr-2" />
              계정명
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="계정명을 입력하세요"
              maxLength={20}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                피드에 표시될 이름입니다
              </span>
              <span className="text-xs text-gray-400">
                {name.length}/20
              </span>
            </div>
          </div>

          {/* 피드 소개 입력 */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              피드 소개
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="피드에 대한 간단한 소개를 작성해보세요"
              maxLength={100}
              rows={3}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                피드 상단에 표시됩니다 (현재 미지원)
              </span>
              <span className="text-xs text-gray-400">
                {description.length}/100
              </span>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ 피드 소개는 백엔드 User 엔티티 확장 후 지원됩니다
            </p>
          </div>

          {/* 백엔드 연동 정보 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">백엔드 연동 정보</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• API: PUT /users/profile (구현 필요)</li>
              <li>• 필드: userName, accountName 업데이트</li>
              <li>• 인증: Bearer 토큰 자동 처리</li>
              <li>• 에러: 표준 ApiResponse 형식</li>
            </ul>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                저장 중...
              </div>
            ) : (
              '저장'
            )}
          </button>
        </div>

        {/* 키보드 힌트 */}
        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-gray-400">
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">ESC</kbd> 취소
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProfileEditModal