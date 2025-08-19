// =============================================================================
// 📁 ProfileEditModal.tsx - 완전히 새로운 구현 (캐시 문제 해결)
// =============================================================================

'use client'

import React, { useState, useEffect } from 'react'
import { 
  LockClosedIcon, 
  ExclamationTriangleIcon,
  UserIcon,
  AtSymbolIcon,
  PencilSquareIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/auth/useAuth'
import api from '@/lib/axios'

// ============================================================================
// 타입 정의
// ============================================================================

interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

interface UserInfoResponse {
  userName: string;
  userEmail: string;
  userProfileImage: string | null;
  faceImageUrl: string | null;
}

interface UserProfileResponse {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage: string | null;
  prettyFace: string | null;
}

interface UpdateProfileRequest {
  accountName: string;
}

interface CheckAccountNameResponse {
  available: boolean;
  message?: string;
}

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate?: (updatedUser: any) => void;
}

// ============================================================================
// 🔥 완전히 새로운 API 함수들 - 캐시 방지
// ============================================================================

class ProfileAPIService {
  private static instance: ProfileAPIService;
  
  static getInstance(): ProfileAPIService {
    if (!ProfileAPIService.instance) {
      ProfileAPIService.instance = new ProfileAPIService();
    }
    return ProfileAPIService.instance;
  }

  // 🔥 GET /user/userInfo - 캐시 방지 타임스탬프 추가
  async getUserInfo(): Promise<UserInfoResponse> {
    const timestamp = Date.now();
    console.log(`🔥 [${timestamp}] API 요청 - GET /user/userInfo`);

    try {
      const response = await api.get<ApiResponse<UserInfoResponse>>(
        `/user/userInfo?_t=${timestamp}` // 캐시 방지
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '사용자 정보를 불러올 수 없습니다.');
      }
      
      console.log(`🔥 [${timestamp}] API 응답 - 사용자 정보:`, response.data.data);
      return response.data.data;
    } catch (error: any) {
      console.error(`🚨 [${timestamp}] 사용자 정보 API 실패:`, error);
      throw error;
    }
  }

  // 🔥 GET /user/profile - 캐시 방지 타임스탬프 추가
  async getCurrentUserProfile(): Promise<UserProfileResponse> {
    const timestamp = Date.now();
    console.log(`🔥 [${timestamp}] API 요청 - GET /user/profile`);

    try {
      const response = await api.get<ApiResponse<UserProfileResponse>>(
        `/user/profile?_t=${timestamp}` // 캐시 방지
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '프로필을 불러올 수 없습니다.');
      }
      
      console.log(`🔥 [${timestamp}] API 응답 - 현재 사용자 프로필:`, response.data.data);
      return response.data.data;
    } catch (error: any) {
      console.error(`🚨 [${timestamp}] 현재 사용자 프로필 API 실패:`, error);
      throw error;
    }
  }

  // 🔥 PUT /user/profile
  async updateProfile(data: UpdateProfileRequest): Promise<void> {
    const timestamp = Date.now();
    console.log(`🔥 [${timestamp}] API 요청 - PUT /user/profile:`, data);

    try {
      const response = await api.put<ApiResponse<void>>('/user/profile', data);
      
      if (response.data.error) {
        throw new Error(response.data.message || '프로필 업데이트에 실패했습니다.');
      }
      
      console.log(`🔥 [${timestamp}] API 응답 - 프로필 업데이트 완료`);
    } catch (error: any) {
      console.error(`🚨 [${timestamp}] 프로필 업데이트 API 실패:`, error);
      throw error;
    }
  }

  // 🔥 GET /user/check-account-name
  async checkAccountName(accountName: string): Promise<CheckAccountNameResponse> {
    const timestamp = Date.now();
    console.log(`🔥 [${timestamp}] API 요청 - GET /user/check-account-name:`, accountName);

    try {
      const response = await api.get<ApiResponse<CheckAccountNameResponse>>(
        `/user/check-account-name?accountName=${encodeURIComponent(accountName)}&_t=${timestamp}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '계정명 확인에 실패했습니다.');
      }
      
      console.log(`🔥 [${timestamp}] API 응답 - 계정명 확인:`, response.data.data);
      return response.data.data;
    } catch (error: any) {
      console.error(`🚨 [${timestamp}] 계정명 확인 API 실패:`, error);
      throw error;
    }
  }
}

// ============================================================================
// ProfileEditModal 컴포넌트 - 완전히 새로운 구현
// ============================================================================

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ 
  isOpen, 
  onClose, 
  onProfileUpdate 
}) => {
  const { user, isAuthenticated, handleLogin } = useAuth();
  const profileAPI = ProfileAPIService.getInstance();
  
  // 상태 관리
  const [formData, setFormData] = useState({ accountName: '' });
  const [userInfo, setUserInfo] = useState<UserInfoResponse | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfileResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isCheckingAccountName, setIsCheckingAccountName] = useState(false);
  const [accountNameStatus, setAccountNameStatus] = useState<{
    status: 'checking' | 'available' | 'unavailable' | 'error' | null;
    message?: string;
  }>({ status: null });
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ 
    message: string; 
    type: 'success' | 'error' | 'info' 
  } | null>(null);

  // 🔥 토스트 메시지 함수
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 🔥 에러 처리 함수
  const handleError = (err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err);
    
    let errorMessage = '알 수 없는 오류가 발생했습니다.';
    
    if (err instanceof Error) {
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
      } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
        errorMessage = '권한이 없습니다.';
      } else if (err.message.includes('404') || err.message.includes('Not Found')) {
        errorMessage = '요청한 정보를 찾을 수 없습니다.';
      } else {
        errorMessage = err.message;
      }
    }
    
    setError(errorMessage);
    showToast(errorMessage, 'error');
    setTimeout(() => setError(null), 5000);
  };

  // 🔥 계정명 중복 확인 함수
  const checkAccountName = async (accountName: string) => {
    if (!accountName.trim() || !isAuthenticated) {
      setAccountNameStatus({ status: null });
      return;
    }

    if (currentProfile?.accountName === accountName) {
      setAccountNameStatus({ 
        status: 'available', 
        message: '현재 계정명입니다.' 
      });
      return;
    }

    setIsCheckingAccountName(true);
    setAccountNameStatus({ status: 'checking' });

    try {
      const result = await profileAPI.checkAccountName(accountName);
      
      if (result.available) {
        setAccountNameStatus({ 
          status: 'available', 
          message: '사용 가능한 계정명입니다.' 
        });
      } else {
        setAccountNameStatus({ 
          status: 'unavailable', 
          message: result.message || '이미 사용 중인 계정명입니다.' 
        });
      }
    } catch (err: any) {
      console.error('계정명 확인 실패:', err);
      setAccountNameStatus({ 
        status: 'error', 
        message: '계정명 확인 중 오류가 발생했습니다.' 
      });
    } finally {
      setIsCheckingAccountName(false);
    }
  };

  // 🔥 사용자 데이터 로드 함수 - 완전히 새로운 구현
  const fetchUserData = async () => {
    if (!isAuthenticated || !user) {
      console.log('🔒 사용자가 인증되지 않음, 데이터 로딩 중단');
      return;
    }

    setIsLoadingData(true);
    setError(null);

    try {
      console.log('🔥 사용자 데이터 로딩 시작 - 새로운 구현');

      // 🔥 순차적으로 API 호출 (병렬 호출 문제 해결)
      console.log('🔥 1단계: 사용자 기본 정보 조회');
      const userInfoData = await profileAPI.getUserInfo();
      setUserInfo(userInfoData);

      console.log('🔥 2단계: 현재 프로필 정보 조회');
      const profileData = await profileAPI.getCurrentUserProfile();
      setCurrentProfile(profileData);

      // 폼 데이터 설정
      setFormData({
        accountName: profileData.accountName || '',
      });

      console.log('🔥 사용자 데이터 로딩 완료:', { userInfoData, profileData });

    } catch (err: any) {
      console.error('❌ 사용자 데이터 로딩 실패:', err);
      handleError(err, '사용자 데이터 로딩');
    } finally {
      setIsLoadingData(false);
    }
  };

  // 🔥 폼 제출 함수
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    if (isSubmitting) return;

    if (accountNameStatus.status !== 'available') {
      showToast('유효한 계정명을 입력해주세요.', 'error');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('🔥 프로필 업데이트 시작:', {
        currentAccountName: currentProfile?.accountName,
        newAccountName: formData.accountName,
      });

      // 계정명이 변경된 경우만 업데이트
      if (formData.accountName !== currentProfile?.accountName) {
        console.log('🔥 계정명 업데이트:', formData.accountName);
        
        await profileAPI.updateProfile({
          accountName: formData.accountName,
        });
        
        console.log('🔥 계정명 업데이트 완료');

        // 사용자 정보 다시 가져오기
        try {
          console.log('🔥 사용자 정보 새로고침 시작');
          
          const updatedProfileData = await profileAPI.getCurrentUserProfile();
          setCurrentProfile(updatedProfileData);
          
          if (onProfileUpdate) {
            onProfileUpdate(updatedProfileData);
          }

          console.log('🔥 사용자 정보 새로고침 완료:', updatedProfileData);
        } catch (refreshError) {
          console.warn('사용자 정보 새로고침 실패:', refreshError);
        }

        showToast('프로필이 성공적으로 업데이트되었습니다!');
        setTimeout(() => onClose(), 1000);
      } else {
        console.log('🔥 계정명 변경사항 없음');
        showToast('변경사항이 없습니다.', 'info');
      }

    } catch (error: any) {
      console.error('❌ 프로필 업데이트 실패:', error);
      handleError(error, '프로필 업데이트');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔥 입력 필드 변경 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 🔥 계정명 변경 디바운스 처리
  useEffect(() => {
    if (!formData.accountName) return;
    
    const timeoutId = setTimeout(() => {
      checkAccountName(formData.accountName);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.accountName]);

  // 🔥 모달 열릴 때 데이터 로드
  useEffect(() => {
    if (isOpen && isAuthenticated && user) {
      console.log('🔥 모달 열림 - 데이터 로드 시작');
      fetchUserData();
    }
  }, [isOpen, isAuthenticated, user]);

  // 🔥 ESC 키 처리
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
  const isFormValid = formData.accountName.trim().length > 0 && accountNameStatus.status === 'available';

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LockClosedIcon className="h-8 w-8 text-red-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            로그인이 필요합니다
          </h3>
          
          <p className="text-gray-600 mb-4 text-sm">
            프로필을 편집하시려면 먼저 로그인해주세요.
          </p>
          
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                onClose();
                handleLogin();
              }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              로그인하러 가기
            </button>
            
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
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
              {currentProfile && (
                <p className="text-sm text-gray-500">@{currentProfile.accountName}</p>
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
        {!isLoadingData && userInfo && currentProfile && (
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
                    <p className="text-sm text-gray-800">{userInfo.userName}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">이메일</label>
                  <div className="flex items-center mt-1">
                    <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    <p className="text-sm text-gray-800">{userInfo.userEmail}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 계정명 편집 */}
            <div>
              <label htmlFor="accountName" className="block text-sm font-semibold text-gray-700 mb-2">
                <AtSymbolIcon className="h-4 w-4 inline mr-1" />
                계정명 *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="accountName"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors ${
                    accountNameStatus.status === 'available' ? 'border-green-300 bg-green-50' :
                    accountNameStatus.status === 'unavailable' ? 'border-red-300 bg-red-50' :
                    'border-gray-300'
                  }`}
                  placeholder="계정명을 입력하세요"
                  maxLength={50}
                  required
                />
                {isCheckingAccountName && (
                  <div className="absolute right-3 top-2.5">
                    <ArrowPathIcon className="h-4 w-4 text-blue-500 animate-spin" />
                  </div>
                )}
              </div>
              
              {/* 계정명 상태 메시지 */}
              {accountNameStatus.status && accountNameStatus.message && (
                <p className={`text-xs mt-1 ${
                  accountNameStatus.status === 'available' ? 'text-green-600' :
                  accountNameStatus.status === 'unavailable' ? 'text-red-600' :
                  accountNameStatus.status === 'error' ? 'text-red-600' :
                  'text-gray-500'
                }`}>
                  {accountNameStatus.message}
                </p>
              )}
              
              <p className="text-xs text-gray-500 mt-1">
                다른 사용자들이 볼 수 있는 고유한 계정명입니다.
              </p>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-red-600">{error}</p>
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

        {/* 디버그 정보 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-30 max-w-xs">
            <div className="font-semibold mb-1">🔥 NEW 프로필편집 디버그</div>
            <div>인증: {isAuthenticated ? 'Yes' : 'No'}</div>
            <div>계정명: {currentProfile?.accountName || 'None'}</div>
            <div>로딩: {isLoadingData ? 'Yes' : 'No'}</div>
            <div>제출 중: {isSubmitting ? 'Yes' : 'No'}</div>
            <div>폼 유효: {isFormValid ? 'Yes' : 'No'}</div>
            <div>입력값: {formData.accountName}</div>
            <div>상태: {accountNameStatus.status}</div>
            <div>타임스탬프: {Date.now()}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileEditModal;