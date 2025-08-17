// =============================================================================
// 📁 ProfileEditModal.tsx - 인증된 사용자 전용 + 완전한 백엔드 연동 버전
// =============================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  LockClosedIcon, 
  ExclamationTriangleIcon,
  UserIcon,
  AtSymbolIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/auth/useAuth'

// 🔥 백엔드 연동
import api from '@/lib/axios'

// ============================================================================
// 백엔드 API 응답 타입 정의 (백엔드와 완전 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// 🔥 사용자 프로필 업데이트 요청 타입
interface UpdateProfileRequest {
  accountName: string;
}

// 🔥 피드 정보 업데이트 요청 타입
interface UpdateFeedRequest {
  title: string;
  description: string;
}

// 🔥 FeedWithPostsResponse.java에서 피드 정보만 추출
interface FeedInfoResponse {
  feedId: number;
  userId: number;
  accountName: string;
  profileImage: string | null;
  title?: string;
  description?: string;
  createdAt: string;
}

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate?: (updatedUser: any) => void;
}

// ============================================================================
// 백엔드 API 함수들 (완전한 인증 처리)
// ============================================================================

const profileAPI = {
  // 🔥 GET /user/userInfo - 사용자 정보 조회
  getUserInfo: async (): Promise<any> => {
    console.log('🔥 API 요청 - GET /user/userInfo');

    const response = await api.get<ApiResponse<any>>('/user/userInfo');
    
    if (response.data.error) {
      throw new Error(response.data.message || '사용자 정보를 불러올 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 사용자 정보:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /feeds/users/{userId} - 사용자 피드 정보 조회
  getUserFeed: async (userId: number): Promise<FeedInfoResponse> => {
    console.log('🔥 API 요청 - GET /feeds/users/' + userId);

    const response = await api.get<ApiResponse<FeedInfoResponse>>(`/feeds/users/${userId}`);
    
    if (response.data.error) {
      throw new Error(response.data.message || '피드 정보를 불러올 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 피드 정보:', response.data.data);
    return response.data.data;
  },

  // 🔥 PUT /user/profile - 사용자 프로필 업데이트
  updateProfile: async (data: UpdateProfileRequest): Promise<void> => {
    console.log('🔥 API 요청 - PUT /user/profile:', data);

    const response = await api.put<ApiResponse<void>>('/user/profile', data);
    
    if (response.data.error) {
      throw new Error(response.data.message || '프로필 업데이트에 실패했습니다.');
    }
    
    console.log('🔥 API 응답 - 프로필 업데이트 완료');
  },

  // 🔥 PUT /feeds/my-feed - 피드 정보 업데이트
  updateFeed: async (data: UpdateFeedRequest): Promise<void> => {
    console.log('🔥 API 요청 - PUT /feeds/my-feed:', data);

    const response = await api.put<ApiResponse<void>>('/feeds/my-feed', data);
    
    if (response.data.error) {
      throw new Error(response.data.message || '피드 업데이트에 실패했습니다.');
    }
    
    console.log('🔥 API 응답 - 피드 업데이트 완료');
  },
};

// ============================================================================
// 인증 보호 컴포넌트
// ============================================================================

interface AuthGuardProps {
  children: React.ReactNode;
  className?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, className = '' }) => {
  const { isAuthenticated, isLoading, handleLogin } = useAuth();

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center h-48 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600 text-sm">인증 상태를 확인하는 중...</p>
      </div>
    );
  }

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-48 text-center p-6 bg-white rounded-lg border border-gray-200 ${className}`}>
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <LockClosedIcon className="h-8 w-8 text-red-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          로그인이 필요합니다
        </h3>
        
        <p className="text-gray-600 mb-4 text-sm">
          프로필을 편집하시려면 먼저 로그인해주세요.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleLogin}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인하러 가기
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4 inline mr-1" />
            새로고침
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <strong>안전한 서비스:</strong> 모든 프로필 편집 기능은 로그인한 사용자만 이용할 수 있습니다.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 인증된 경우 자식 컴포넌트 렌더링
  return <>{children}</>;
};

// ============================================================================
// ProfileEditModal 컴포넌트 (인증 보호 + 완전한 백엔드 연동)
// ============================================================================

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ 
  isOpen, 
  onClose, 
  onProfileUpdate 
}) => {
  const { user, isAuthenticated, handleLogin } = useAuth();
  
  // 상태 관리
  const [formData, setFormData] = useState({
    accountName: '',
    feedTitle: '',
    feedDescription: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // 토스트 메시지 표시
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // 에러 처리 (인증 관련 에러 포함)
  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err);
    
    let errorMessage = '알 수 없는 오류가 발생했습니다.';
    
    if (err instanceof Error) {
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
      } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
        errorMessage = '권한이 없습니다.';
      } else if (err.message.includes('404') || err.message.includes('Not Found')) {
        errorMessage = '요청한 정보를 찾을 수 없습니다.';
      } else if (err.message.includes('계정명') && err.message.includes('중복')) {
        errorMessage = '이미 사용 중인 계정명입니다. 다른 계정명을 입력해주세요.';
      } else {
        errorMessage = err.message;
      }
    }
    
    setError(errorMessage);
    showToast(errorMessage, 'error');
    
    // 인증 에러인 경우 로그인 페이지로 이동
    if (errorMessage.includes('인증이 만료') || errorMessage.includes('권한이 없')) {
      setTimeout(() => {
        onClose();
        handleLogin();
      }, 2000);
    }
    
    setTimeout(() => setError(null), 5000);
  }, [showToast, onClose, handleLogin]);

  // 현재 사용자 정보와 피드 정보 가져오기
  const fetchUserData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      console.log('🔒 사용자가 인증되지 않음, 데이터 로딩 중단');
      return;
    }

    setIsLoadingData(true);
    setError(null);

    try {
      console.log('🔥 사용자 데이터 로딩 시작:', user.id);

      // 기본값 설정
      setFormData({
        accountName: user.accountName || '',
        feedTitle: '',
        feedDescription: '',
      });

      // 🔥 사용자 피드 정보 가져오기 (자동 인증 처리)
      try {
        const feedData = await profileAPI.getUserFeed(user.id);
        
        setFormData(prev => ({
          ...prev,
          feedTitle: feedData.title || '',
          feedDescription: feedData.description || '',
        }));

        console.log('🔥 피드 정보 로딩 완료:', feedData);
      } catch (feedError: any) {
        console.warn('피드 정보 가져오기 실패 (새 사용자일 수 있음):', feedError);
        
        // 404 에러는 새 사용자로 간주하고 무시
        if (!feedError?.response || feedError.response.status !== 404) {
          handleError(feedError, '피드 정보 로딩');
        }
      }

      console.log('🔥 사용자 데이터 로딩 완료');

    } catch (err: any) {
      console.error('사용자 데이터 로딩 실패:', err);
      
      // 인증 관련 에러 처리
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '사용자 데이터 로딩');
      } else {
        handleError(err, '사용자 데이터 로딩');
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [isAuthenticated, user, handleError]);

  // 모달 열릴 때 사용자 데이터 가져오기
  useEffect(() => {
    if (isOpen && isAuthenticated && user) {
      fetchUserData();
    }
  }, [isOpen, isAuthenticated, user, fetchUserData]);

  // 폼 제출 처리 (인증 체크 포함)
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      showToast('로그인이 필요합니다.', 'error');
      setTimeout(() => {
        onClose();
        handleLogin();
      }, 1500);
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('🔥 프로필 업데이트 시작:', {
        currentUser: user.accountName,
        newAccountName: formData.accountName,
        feedTitle: formData.feedTitle,
        feedDescription: formData.feedDescription
      });

      // 1. 계정명 업데이트 (변경된 경우만)
      if (formData.accountName !== user.accountName) {
        console.log('🔥 계정명 업데이트:', formData.accountName);
        
        await profileAPI.updateProfile({
          accountName: formData.accountName,
        });
        
        console.log('🔥 계정명 업데이트 완료');
      }

      // 2. 피드 정보 업데이트
      console.log('🔥 피드 정보 업데이트:', {
        title: formData.feedTitle,
        description: formData.feedDescription
      });

      await profileAPI.updateFeed({
        title: formData.feedTitle,
        description: formData.feedDescription,
      });

      console.log('🔥 피드 정보 업데이트 완료');

      // 3. 사용자 정보 다시 가져와서 상태 업데이트
      try {
        console.log('🔥 사용자 정보 새로고침 시작');
        
        const updatedUserData = await profileAPI.getUserInfo();
        
        // 부모 컴포넌트에 업데이트된 사용자 정보 전달
        if (onProfileUpdate) {
          onProfileUpdate(updatedUserData);
        }

        console.log('🔥 사용자 정보 새로고침 완료:', updatedUserData);
      } catch (refreshError) {
        console.warn('사용자 정보 새로고침 실패:', refreshError);
        // 새로고침 실패는 무시 (메인 업데이트는 성공)
      }

      console.log('🔥 프로필 업데이트 전체 완료');
      showToast('프로필이 성공적으로 업데이트되었습니다!');
      
      // 잠시 후 모달 닫기
      setTimeout(() => onClose(), 1000);

    } catch (error: any) {
      console.error('프로필 업데이트 실패:', error);
      
      // 인증 관련 에러 처리
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '프로필 업데이트');
      } else {
        // 구체적인 에러 메시지 처리
        const errorMessage = error?.response?.data?.message || error?.message || '프로필 업데이트에 실패했습니다.';
        handleError(new Error(errorMessage), '프로필 업데이트');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isAuthenticated, 
    user, 
    isSubmitting, 
    formData, 
    onProfileUpdate, 
    showToast, 
    handleError, 
    onClose, 
    handleLogin
  ]);

  // 입력 필드 변경 처리
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // 모달 닫기 (ESC 키 지원)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isSubmitting, onClose]);

  // 폼 유효성 검사
  const isFormValid = formData.accountName.trim().length > 0;

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  // ============================================================================
  // 메인 렌더링 - AuthGuard로 감싸기
  // ============================================================================

  const renderContent = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <PencilSquareIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">프로필 편집</h2>
              {user && (
                <p className="text-sm text-gray-500">@{user.accountName}로 로그인됨</p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
            disabled={isSubmitting}
            title="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 로딩 상태 */}
        {isLoadingData && (
          <div className="p-6 flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />
              <span className="text-gray-600">데이터를 불러오는 중...</span>
            </div>
          </div>
        )}

        {/* 메인 폼 */}
        {!isLoadingData && (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* 읽기 전용 정보 */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                <LockClosedIcon className="h-4 w-4 mr-2" />
                변경 불가 정보
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">이름</label>
                  <div className="flex items-center mt-1">
                    <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-800">{user?.name}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">이메일</label>
                  <div className="flex items-center mt-1">
                    <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    <p className="text-sm text-gray-800">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 계정명 */}
            <div>
              <label htmlFor="accountName" className="block text-sm font-semibold text-gray-700 mb-2">
                <AtSymbolIcon className="h-4 w-4 inline mr-1" />
                계정명 *
              </label>
              <input
                type="text"
                id="accountName"
                name="accountName"
                value={formData.accountName}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                placeholder="계정명을 입력하세요"
                maxLength={255}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                다른 사용자들이 볼 수 있는 고유한 계정명입니다. (영문, 숫자, 언더스코어만 허용)
              </p>
            </div>

            {/* 피드 제목 */}
            <div>
              <label htmlFor="feedTitle" className="block text-sm font-semibold text-gray-700 mb-2">
                <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                피드 제목
              </label>
              <input
                type="text"
                id="feedTitle"
                name="feedTitle"
                value={formData.feedTitle}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                placeholder="피드 제목을 입력하세요"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.feedTitle.length}/100자
              </p>
            </div>

            {/* 피드 설명 */}
            <div>
              <label htmlFor="feedDescription" className="block text-sm font-semibold text-gray-700 mb-2">
                <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                피드 설명
              </label>
              <textarea
                id="feedDescription"
                name="feedDescription"
                value={formData.feedDescription}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors resize-none"
                placeholder="피드에 대한 설명을 입력하세요"
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.feedDescription.length}/500자
              </p>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-red-600">{error}</p>
                    {error.includes('인증이 만료') && (
                      <button
                        onClick={() => {
                          onClose();
                          handleLogin();
                        }}
                        className="text-sm text-red-700 underline hover:text-red-900 mt-1"
                      >
                        로그인하러 가기
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </form>
        )}

        {/* 하단 버튼들 */}
        {!isLoadingData && (
          <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-gray-700"
            >
              취소
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid || !isAuthenticated}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </button>
          </div>
        )}

        {/* 토스트 메시지 */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-60">
            <div className={`px-4 py-2 rounded-lg text-white font-medium shadow-lg transition-all duration-300 ${
              toastMessage.type === 'success' ? 'bg-green-500' : 
              toastMessage.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`}>
              {toastMessage.message}
            </div>
          </div>
        )}

        {/* 개발 정보 (개발 모드에서만) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-30 max-w-xs">
            <div className="font-semibold mb-1">🔥 프로필편집 디버그</div>
            <div>인증: {isAuthenticated ? 'Yes' : 'No'}</div>
            <div>사용자: {user?.accountName || 'None'}</div>
            <div>로딩: {isLoadingData ? 'Yes' : 'No'}</div>
            <div>제출 중: {isSubmitting ? 'Yes' : 'No'}</div>
            <div>폼 유효: {isFormValid ? 'Yes' : 'No'}</div>
            <div>계정명: {formData.accountName}</div>
            <div>제목: {formData.feedTitle}</div>
            <div>설명 길이: {formData.feedDescription.length}</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AuthGuard>
      {renderContent()}
    </AuthGuard>
  );
};

// ============================================================================
// ProfilePage 컴포넌트 (인증 보호 + 완전한 백엔드 연동)
// ============================================================================

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, isLoading, handleLogin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 토스트 메시지 표시
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // 에러 처리
  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err);
    
    let errorMessage = '알 수 없는 오류가 발생했습니다.';
    
    if (err instanceof Error) {
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
      } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
        errorMessage = '권한이 없습니다.';
      } else {
        errorMessage = err.message;
      }
    }
    
    setError(errorMessage);
    showToast(errorMessage, 'error');
    
    // 인증 에러인 경우 로그인 페이지로 이동
    if (errorMessage.includes('인증이 만료') || errorMessage.includes('권한이 없')) {
      setTimeout(() => handleLogin(), 2000);
    }
    
    setTimeout(() => setError(null), 5000);
  }, [showToast, handleLogin]);

  // 프로필 데이터 새로고침
  const refreshProfileData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      console.log('🔥 프로필 데이터 새로고침 시작');
      
      // 🔥 최신 사용자 정보 가져오기 (자동 인증 처리)
      const updatedUserData = await profileAPI.getUserInfo();
      setProfileData(updatedUserData);
      
      console.log('🔥 프로필 데이터 새로고침 완료:', updatedUserData);
      showToast('프로필 정보가 새로고침되었습니다.');

    } catch (err: any) {
      console.error('프로필 데이터 새로고침 실패:', err);
      
      // 인증 관련 에러 처리
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '프로필 데이터 새로고침');
      } else {
        handleError(err, '프로필 데이터 새로고침');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated, user, handleError, showToast]);

  // 초기 프로필 데이터 설정
  useEffect(() => {
    if (isAuthenticated && user) {
      setProfileData(user);
    }
  }, [isAuthenticated, user]);

  // 모달 열기
  const handleOpenModal = useCallback(() => {
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      setTimeout(() => handleLogin(), 1500);
      return;
    }
    setIsModalOpen(true);
  }, [isAuthenticated, showToast, handleLogin]);

  // 모달 닫기
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // 프로필 업데이트 콜백
  const handleProfileUpdate = useCallback((updatedUser: any) => {
    console.log('🔥 프로필 업데이트 콜백:', updatedUser);
    setProfileData(updatedUser);
    showToast('프로필이 업데이트되었습니다!');
    
    // 추가로 프로필 데이터 새로고침
    setTimeout(() => refreshProfileData(), 1000);
  }, [refreshProfileData, showToast]);

  // 메인 렌더링
  const renderContent = () => {
    // 로딩 상태
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">프로필을 불러오는 중...</p>
        </div>
      );
    }

    // 인증되지 않은 경우
    if (!isAuthenticated) {
      return (
        <div className="flex flex-col items-center justify-center min-h-64 text-center p-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <LockClosedIcon className="h-10 w-10 text-red-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            로그인이 필요합니다
          </h2>
          
          <p className="text-gray-600 mb-6 max-w-md">
            프로필 페이지를 보시려면 먼저 로그인해주세요. <br />
            로그인 후 프로필을 편집하고 관리할 수 있습니다.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleLogin}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              로그인하러 가기
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              <ArrowPathIcon className="h-5 w-5 inline mr-2" />
              새로고침
            </button>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <strong>안전한 서비스:</strong> 모든 프로필 기능은 로그인한 사용자만 이용할 수 있습니다.
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 메인 프로필 페이지
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">내 프로필</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={refreshProfileData}
              disabled={isRefreshing}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
              title="프로필 새로고침"
            >
              <ArrowPathIcon className={`h-5 w-5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              새로고침
            </button>
            {isAuthenticated && (
              <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                인증됨
              </span>
            )}
          </div>
        </div>
        
        {profileData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6 space-y-6">
            {/* 프로필 헤더 */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{profileData.name}</h2>
                <p className="text-gray-600">@{profileData.accountName}</p>
              </div>
            </div>

            {/* 프로필 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">이름</label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <p className="text-gray-900">{profileData.name}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">이메일</label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <svg className="h-5 w-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    <p className="text-gray-900">{profileData.email}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">계정명</label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <AtSymbolIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <p className="text-gray-900">@{profileData.accountName}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">가입일</label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <svg className="h-5 w-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-900">
                      {profileData.createdAt ? new Date(profileData.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : '정보 없음'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 에러 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-600">{error}</p>
                {error.includes('인증이 만료') && (
                  <button
                    onClick={handleLogin}
                    className="text-sm text-red-700 underline hover:text-red-900 mt-1"
                  >
                    로그인하러 가기
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={handleOpenModal}
            disabled={!isAuthenticated}
            className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <PencilSquareIcon className="h-5 w-5 mr-2" />
            프로필 편집
          </button>
          
          <button 
            onClick={refreshProfileData}
            disabled={isRefreshing || !isAuthenticated}
            className="flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <ArrowPathIcon className={`h-5 w-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? '새로고침 중...' : '새로고침'}
          </button>
        </div>

        {/* 프로필 편집 모달 */}
        <ProfileEditModal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal}
          onProfileUpdate={handleProfileUpdate}
        />

        {/* 토스트 메시지 */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className={`px-4 py-2 rounded-lg text-white font-medium shadow-lg transition-all duration-300 ${
              toastMessage.type === 'success' ? 'bg-green-500' : 
              toastMessage.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`}>
              {toastMessage.message}
            </div>
          </div>
        )}

        {/* 개발 정보 (개발 모드에서만) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-30 max-w-xs">
            <div className="font-semibold mb-1">🔥 프로필페이지 디버그</div>
            <div>인증: {isAuthenticated ? 'Yes' : 'No'}</div>
            <div>로딩: {isLoading ? 'Yes' : 'No'}</div>
            <div>사용자: {profileData?.accountName || 'None'}</div>
            <div>모달 열림: {isModalOpen ? 'Yes' : 'No'}</div>
            <div>새로고침 중: {isRefreshing ? 'Yes' : 'No'}</div>
            <div>에러: {error ? 'Yes' : 'No'}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <AuthGuard>
          {renderContent()}
        </AuthGuard>
      </div>
    </div>
  );
};

export { ProfileEditModal, ProfilePage };
export default ProfilePage;