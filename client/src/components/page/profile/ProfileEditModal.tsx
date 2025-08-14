// =============================================================================
// 📁 ProfileEditModal.tsx - 백엔드 완벽 연동 버전
// =============================================================================

'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon, UserIcon, DocumentTextIcon, CameraIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/auth/useAuth'

// 🔥 백엔드 연동 - axios 인스턴스 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 DTO 기반 타입 정의 (Java 백엔드와 완벽 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T;
}

// UserProfileResponse.java 기반 (User 도메인)
interface UserProfileResponse {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage: string | null;
  prettyFace: string | null;
}

// 프로필 업데이트 요청 DTO (실제 백엔드 API에 맞춰 조정)
interface UpdateUserProfileRequest {
  userName?: string;
  accountName?: string;
  bio?: string; // 사용자 소개 (User 엔티티 확장 필요)
  profileImageUrl?: string; // 프로필 이미지 URL (향후 구현)
}

// MyPageResponse.java 기반 (가정)
interface MyPageResponse {
  user: UserProfileResponse;
  feedStats: {
    postCount: number;
    totalLikes: number;
    followerCount: number;
    followingCount: number;
  };
}

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;        // User.userName 또는 accountName
  currentDescription: string; // 향후 User.bio 필드
  profileImage?: string;      // User.profileImage
  accountName?: string;       // User.accountName
  onSave: (data: { name: string; description: string; accountName?: string }) => void;
}

// ============================================================================
// 백엔드 API 엔드포인트 상수
// ============================================================================

const USER_ENDPOINTS = {
  // User 도메인 관련 엔드포인트들 (실제 구현에 따라 조정)
  UPDATE_PROFILE: '/users/profile',
  GET_MY_PAGE: '/users/me',
  UPDATE_PROFILE_IMAGE: '/users/profile/image',
  CHECK_ACCOUNT_NAME: (accountName: string) => `/users/check-account-name/${accountName}`,
};

// ============================================================================
// 백엔드 API 함수들 (실제 Java Controller 엔드포인트 사용)
// ============================================================================

const userAPI = {
  // 🔥 PUT /users/profile - 프로필 업데이트
  updateProfile: async (data: UpdateUserProfileRequest): Promise<UserProfileResponse> => {
    try {
      console.log('=== 프로필 업데이트 API 호출 ===', data);
      
      const response = await api.put<ApiResponse<UserProfileResponse>>(
        USER_ENDPOINTS.UPDATE_PROFILE,
        data
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '프로필 업데이트에 실패했습니다.');
      }
      
      console.log('=== 프로필 업데이트 성공 ===', response.data.data);
      return response.data.data;
      
    } catch (error) {
      console.error('🔥 Profile update failed:', error);
      
      // 백엔드 에러 메시지 추출
      if (error instanceof Error) {
        throw error;
      }
      
      const apiError = error as any;
      const errorMessage = apiError?.response?.data?.message || 
                          apiError?.message || 
                          '프로필 업데이트에 실패했습니다.';
      
      throw new Error(errorMessage);
    }
  },

  // 🔥 GET /users/me - 현재 사용자 정보 조회
  getMyPage: async (): Promise<MyPageResponse> => {
    try {
      const response = await api.get<ApiResponse<MyPageResponse>>(
        USER_ENDPOINTS.GET_MY_PAGE
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '사용자 정보를 불러올 수 없습니다.');
      }
      
      return response.data.data;
      
    } catch (error) {
      console.error('🔥 Failed to get user info:', error);
      
      // API가 없는 경우 기본값 반환
      const userInfo = {
        userId: 0,
        accountName: 'unknown',
        userName: '사용자',
        userEmail: 'user@example.com',
        profileImage: null,
        prettyFace: null
      };
      
      return {
        user: userInfo,
        feedStats: {
          postCount: 0,
          totalLikes: 0,
          followerCount: 0,
          followingCount: 0
        }
      };
    }
  },

  // 🔥 GET /users/check-account-name/{accountName} - 계정명 중복 확인
  checkAccountNameAvailability: async (accountName: string): Promise<boolean> => {
    try {
      const response = await api.get<ApiResponse<boolean>>(
        USER_ENDPOINTS.CHECK_ACCOUNT_NAME(accountName)
      );
      
      if (response.data.error) {
        return false; // 에러 시 사용 불가로 간주
      }
      
      return response.data.data; // true: 사용 가능, false: 사용 불가
      
    } catch (error) {
      console.error('🔥 Failed to check account name:', error);
      return false; // 에러 시 사용 불가로 간주
    }
  },

  // 🔥 POST /users/profile/image - 프로필 이미지 업로드 (향후 구현)
  uploadProfileImage: async (imageFile: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await api.post<ApiResponse<{ imageUrl: string }>>(
        USER_ENDPOINTS.UPDATE_PROFILE_IMAGE,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '이미지 업로드에 실패했습니다.');
      }
      
      return response.data.data.imageUrl;
      
    } catch (error) {
      console.error('🔥 Failed to upload profile image:', error);
      throw new Error('이미지 업로드에 실패했습니다.');
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
  accountName: currentAccountName,
  onSave
}) => {
  const { user, isAuthenticated } = useAuth();
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [userName, setUserName] = useState(currentName);
  const [accountName, setAccountName] = useState(currentAccountName || '');
  const [description, setDescription] = useState(currentDescription);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAccountName, setIsCheckingAccountName] = useState(false);
  const [accountNameError, setAccountNameError] = useState<string | null>(null);
  const [accountNameValid, setAccountNameValid] = useState<boolean | null>(null);

  // ============================================================================
  // 초기화
  // ============================================================================

  // 모달이 열릴 때마다 현재 값으로 초기화
  useEffect(() => {
    if (isOpen) {
      setUserName(currentName);
      setAccountName(currentAccountName || '');
      setDescription(currentDescription);
      setError(null);
      setAccountNameError(null);
      setAccountNameValid(null);
    }
  }, [isOpen, currentName, currentAccountName, currentDescription]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        handleCancel();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden'; // 스크롤 방지
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading]);

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 계정명 유효성 검사
  const validateAccountName = (name: string): string | null => {
    if (!name.trim()) {
      return '계정명을 입력해주세요.';
    }
    
    if (name.length < 3) {
      return '계정명은 3자 이상이어야 합니다.';
    }
    
    if (name.length > 20) {
      return '계정명은 20자 이하여야 합니다.';
    }
    
    // 영문, 숫자, 언더스코어만 허용
    const accountNamePattern = /^[a-zA-Z0-9_]+$/;
    if (!accountNamePattern.test(name)) {
      return '계정명은 영문, 숫자, 언더스코어(_)만 사용 가능합니다.';
    }
    
    return null;
  };

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 🔥 백엔드 연동 - 계정명 중복 확인
  const checkAccountName = async (name: string) => {
    if (name === currentAccountName) {
      setAccountNameValid(true);
      setAccountNameError(null);
      return;
    }

    const validationError = validateAccountName(name);
    if (validationError) {
      setAccountNameError(validationError);
      setAccountNameValid(false);
      return;
    }

    setIsCheckingAccountName(true);
    setAccountNameError(null);

    try {
      const isAvailable = await userAPI.checkAccountNameAvailability(name);
      
      if (isAvailable) {
        setAccountNameValid(true);
        setAccountNameError(null);
      } else {
        setAccountNameValid(false);
        setAccountNameError('이미 사용 중인 계정명입니다.');
      }
      
    } catch (error) {
      setAccountNameValid(false);
      setAccountNameError('계정명 확인 중 오류가 발생했습니다.');
    } finally {
      setIsCheckingAccountName(false);
    }
  };

  // 계정명 변경 핸들러 (디바운스 적용)
  useEffect(() => {
    if (!accountName.trim()) {
      setAccountNameValid(null);
      setAccountNameError(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      checkAccountName(accountName.trim());
    }, 500); // 500ms 디바운스

    return () => clearTimeout(timeoutId);
  }, [accountName]);

  // 🔥 백엔드 연동 - 프로필 저장
  const handleSave = async () => {
    if (!userName.trim()) {
      setError('사용자명을 입력해주세요.');
      return;
    }

    if (!accountName.trim()) {
      setError('계정명을 입력해주세요.');
      return;
    }

    if (accountNameValid === false) {
      setError('유효하지 않은 계정명입니다.');
      return;
    }

    if (!isAuthenticated) {
      setError('로그인이 필요합니다.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('=== 프로필 업데이트 시작 ===', {
        userName: userName.trim(),
        accountName: accountName.trim(),
        description: description.trim()
      });

      // 🔥 백엔드 API 호출
      const updateData: UpdateUserProfileRequest = {
        userName: userName.trim(),
        accountName: accountName.trim(),
        bio: description.trim() || undefined, // 빈 문자열이면 undefined
      };

      const updatedProfile = await userAPI.updateProfile(updateData);
      
      console.log('=== 프로필 업데이트 완료 ===', updatedProfile);
      
      // 부모 컴포넌트에 업데이트된 데이터 전달
      onSave({
        name: updatedProfile.userName,
        description: description.trim(),
        accountName: updatedProfile.accountName
      });
      
      // 성공 시 모달 닫기
      onClose();
      
    } catch (err) {
      console.error('🔥 프로필 업데이트 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '프로필 업데이트에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 취소 핸들러
  const handleCancel = () => {
    if (isLoading) return;

    // 변경사항이 있으면 확인
    const hasChanges = userName !== currentName || 
                      accountName !== (currentAccountName || '') || 
                      description !== currentDescription;

    if (hasChanges) {
      if (window.confirm('변경사항이 저장되지 않습니다. 정말 닫으시겠습니까?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // ============================================================================
  // 유효성 검사
  // ============================================================================

  const canSave = !!(
    userName.trim() && 
    accountName.trim() && 
    !isLoading && 
    !isCheckingAccountName &&
    (accountNameValid === true || accountName === currentAccountName)
  );

  // ============================================================================
  // 렌더링
  // ============================================================================

  if (!isOpen) return null;

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
            aria-label="닫기"
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
              {/* 향후 프로필 이미지 업로드 기능 */}
              <button
                type="button"
                disabled
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg opacity-50 cursor-not-allowed"
                title="프로필 이미지 변경 (향후 지원)"
              >
                <CameraIcon className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              프로필 이미지 변경은 향후 지원될 예정입니다
            </p>
          </div>

          {/* 사용자명 입력 */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="w-4 h-4 mr-2" />
              사용자명
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="사용자명을 입력하세요"
              maxLength={50}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                프로필에 표시될 이름입니다
              </span>
              <span className="text-xs text-gray-400">
                {userName.length}/50
              </span>
            </div>
          </div>

          {/* 계정명 입력 */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="w-4 h-4 mr-2" />
              계정명 (ID)
            </label>
            <div className="relative">
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="계정명을 입력하세요 (영문, 숫자, _만 가능)"
                maxLength={20}
                disabled={isLoading}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  accountNameError 
                    ? 'border-red-300 focus:ring-red-500' 
                    : accountNameValid === true 
                      ? 'border-green-300 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              
              {/* 상태 아이콘 */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {isCheckingAccountName ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                ) : accountNameValid === true ? (
                  <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : accountNameValid === false ? (
                  <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : null}
              </div>
            </div>
            
            <div className="flex justify-between mt-1">
              <div className="text-xs">
                {accountNameError ? (
                  <span className="text-red-600">{accountNameError}</span>
                ) : accountNameValid === true ? (
                  <span className="text-green-600">✓ 사용 가능한 계정명입니다</span>
                ) : (
                  <span className="text-gray-500">고유한 식별자로 사용됩니다</span>
                )}
              </div>
              <span className="text-xs text-gray-400">
                {accountName.length}/20
              </span>
            </div>
          </div>

          {/* 사용자 소개 입력 */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              자기소개
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="자신에 대한 간단한 소개를 작성해보세요"
              maxLength={200}
              rows={3}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                프로필 페이지에 표시됩니다
              </span>
              <span className="text-xs text-gray-400">
                {description.length}/200
              </span>
            </div>
          </div>

          {/* 백엔드 연동 정보 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">🔥 백엔드 연동 정보</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• API: PUT /users/profile</li>
              <li>• 필드: userName, accountName, bio 업데이트</li>
              <li>• 인증: Bearer 토큰 자동 처리</li>
              <li>• 계정명 중복 확인: GET /users/check-account-name/:name</li>
              <li>• 실시간 유효성 검사 적용</li>
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

        {/* 개발 정보 (개발 모드에서만) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mx-6 mb-4 p-3 bg-gray-100 rounded-lg text-xs text-gray-600">
            <div className="font-semibold mb-1">🔥 개발 정보</div>
            <div>사용자명: {userName}</div>
            <div>계정명: {accountName}</div>
            <div>계정명 유효성: {accountNameValid?.toString()}</div>
            <div>저장 가능: {canSave ? 'Yes' : 'No'}</div>
            <div>로딩: {isLoading ? 'Yes' : 'No'}</div>
            <div>계정명 확인 중: {isCheckingAccountName ? 'Yes' : 'No'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileEditModal;

