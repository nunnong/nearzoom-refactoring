// src/app/profile/page.tsx - 백엔드 API에 맞춘 수정

'use client'

import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  CogIcon,
  UserCircleIcon,
  CameraIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  ShieldExclamationIcon,
  UserIcon
} from '@heroicons/react/24/outline'

// 🏗️ 아키텍처 원칙: 통합된 api 인스턴스 사용
import api from '@/lib/axios'

// 🏗️ 아키텍처 원칙: Zustand 스토어 사용
import { useAuthStore } from '@/stores/authStore'

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

// ============================================================================
// 🔥 백엔드 타입 정의 (정확한 User 엔티티 기반)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

// 🔥 백엔드 UserProfileResponse와 정확히 일치하는 타입
interface UserProfileResponse {
  userId: number;
  accountName: string;      // 🔥 변경 가능한 계정명
  userName: string;         // 🔥 소셜 로그인 기반 이름 (변경 불가)
  userEmail: string;
  userProfileImage?: string | null;
  faceImageUrl?: string | null;
}

// 🔥 백엔드 UpdateProfileRequest와 정확히 일치
interface UpdateProfileRequest {
  accountName: string;  // 🔥 계정명만 변경 가능
}

// 🔥 계정명 중복 확인 응답
interface CheckAccountNameResponse {
  available: boolean;
  message: string;
}

// 🔥 프로필 이미지 업로드 응답 타입
interface UploadProfileImageResponse {
  profileImageUrl: string;
  faceImageUrl?: string; // AI 보정 이미지 URL (있는 경우)
}

// ============================================================================
// 🔥 백엔드 API 함수들 (아키텍처 원칙 완전 준수)
// ============================================================================

const profileSettingsAPI = {
  // 🔥 GET /user/profile - 현재 사용자 프로필 조회
  getCurrentProfile: async (): Promise<UserProfileResponse> => {
    try {
      console.log('🔍 현재 사용자 프로필 조회');
      
      const response = await api.get<ApiResponse<UserProfileResponse>>('/user/profile');
      
      if (response.data.error) {
        throw new Error(response.data.message || '프로필 조회에 실패했습니다.');
      }
      
      if (!response.data.data) {
        throw new Error('프로필 데이터를 받을 수 없습니다.');
      }
      
      console.log('✅ 프로필 조회 성공:', response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ 프로필 조회 실패:', error);
      throw error;
    }
  },

  // 🔥 PUT /user/profile - 프로필 정보 업데이트 (계정명만) - 백엔드 API에 정확히 맞춤
  updateProfile: async (profileData: UpdateProfileRequest): Promise<void> => {
    try {
      console.log('🔍 프로필 업데이트:', profileData);
      
      const response = await api.put<ApiResponse<void>>(
        '/user/profile',
        profileData
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '프로필 업데이트에 실패했습니다.');
      }
      
      console.log('✅ 프로필 업데이트 성공');
    } catch (error) {
      console.error('❌ 프로필 업데이트 실패:', error);
      throw error;
    }
  },

  // 🔥 GET /user/check-account-name - 계정명 중복 확인
  checkAccountName: async (accountName: string): Promise<CheckAccountNameResponse> => {
    try {
      console.log('🔍 계정명 중복 확인:', accountName);
      
      const response = await api.get<ApiResponse<CheckAccountNameResponse>>(
        `/user/check-account-name?accountName=${encodeURIComponent(accountName)}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '계정명 확인에 실패했습니다.');
      }
      
      if (!response.data.data) {
        throw new Error('계정명 확인 데이터를 받을 수 없습니다.');
      }
      
      console.log('✅ 계정명 확인 성공:', response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ 계정명 확인 실패:', error);
      throw error;
    }
  },

  // 🔥 POST /user/logout - 로그아웃
  logoutUser: async (): Promise<void> => {
    try {
      console.log('🔍 로그아웃 요청');
      
      const response = await api.post<ApiResponse<void>>('/user/logout');
      
      if (response.data.error) {
        console.warn('로그아웃 API 에러:', response.data.message);
      }
      
      console.log('✅ 로그아웃 성공');
    } catch (error) {
      console.warn('❌ 로그아웃 API 실패:', error);
    }
  },

  // 🔥 DELETE /user/signout - 계정 삭제
  deleteAccount: async (): Promise<void> => {
    try {
      console.log('🔍 계정 삭제 요청');
      
      const response = await api.delete<ApiResponse<void>>('/user/signout');
      
      if (response.data.error) {
        throw new Error(response.data.message || '계정 삭제에 실패했습니다.');
      }
      
      console.log('✅ 계정 삭제 성공');
    } catch (error) {
      console.error('❌ 계정 삭제 실패:', error);
      throw error;
    }
  }
};

const ProfileSettingsPage: React.FC = () => {
  // 🏗️ 아키텍처 원칙: Zustand 스토어에서 인증 상태 관리
  const { user: currentUser, isLoading: authLoading, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  
  // ============================================================================
  // 🔥 상태 관리
  // ============================================================================
  
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null)
  const [loading, setLoading] = useState({
    initial: true,
    save: false,
    logout: false,
    delete: false,
    checkAccountName: false
  })
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [accountNameCheckResult, setAccountNameCheckResult] = useState<CheckAccountNameResponse | null>(null)
  
  // 🔥 편집 폼 상태 (계정명만 수정 가능)
  const [editForm, setEditForm] = useState({
    accountName: ''
  })

  // ============================================================================
  // 🔥 데이터 로딩 (백엔드 API 호출)
  // ============================================================================

  const loadUserProfile = useCallback(async () => {
    if (!isAuthenticated || !currentUser) {
      setLoading(prev => ({ ...prev, initial: false }));
      return;
    }

    try {
      setLoading(prev => ({ ...prev, initial: true }));
      setError(null);

      console.log('=== 사용자 프로필 로딩 시작 ===');

      // 🔥 백엔드 API 호출로 정확한 프로필 데이터 가져오기
      const profile = await profileSettingsAPI.getCurrentProfile();

      setUserProfile(profile);
      
      // 편집 폼 초기화 (계정명만)
      setEditForm({
        accountName: profile.accountName
      });

      console.log('✅ 사용자 프로필 로딩 완료:', profile);

    } catch (error: any) {
      console.error('❌ 사용자 프로필 로딩 실패:', error);
      
      let errorMessage = '프로필을 불러오는데 실패했습니다.';
      
      if (error.response?.status === 401) {
        errorMessage = '로그인이 필요합니다.';
        try {
          await useAuthStore.getState().logout();
        } catch (logoutError) {
          console.warn('로그아웃 처리 실패:', logoutError);
          useAuthStore.getState().clearTokens();
        }
        router.push('/login');
        return;
      } else if (error.response?.status === 403) {
        errorMessage = '프로필에 접근할 권한이 없습니다.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  }, [isAuthenticated, currentUser, router]);

  // 초기 데이터 로드
  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // ============================================================================
  // 🔥 이벤트 핸들러들
  // ============================================================================

  const handleBack = () => {
    router.back();
  };

  // 🔥 계정명 입력 핸들러
  const handleAccountNameChange = async (value: string) => {
    setEditForm(prev => ({
      ...prev,
      accountName: value
    }));
    
    // 입력 시 메시지 클리어
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
    setAccountNameCheckResult(null);

    // 현재 계정명과 같거나 빈 값이면 중복 확인 안함
    if (!value.trim() || (userProfile && value.trim() === userProfile.accountName)) {
      return;
    }

    // 실시간 계정명 중복 확인
    try {
      setLoading(prev => ({ ...prev, checkAccountName: true }));
      const result = await profileSettingsAPI.checkAccountName(value.trim());
      setAccountNameCheckResult(result);
    } catch (error: any) {
      console.error('계정명 확인 실패:', error);
      setAccountNameCheckResult({
        available: false,
        message: '계정명 확인 중 오류가 발생했습니다.'
      });
    } finally {
      setLoading(prev => ({ ...prev, checkAccountName: false }));
    }
  };

  // 🔥 프로필 저장 (계정명만)
  const handleSaveProfile = async () => {
    if (!userProfile) return;

    try {
      setLoading(prev => ({ ...prev, save: true }));
      setError(null);
      setSuccessMessage(null);

      const updateData: UpdateProfileRequest = {
        accountName: editForm.accountName.trim()
      };

      // 유효성 검사
      if (!updateData.accountName) {
        throw new Error('계정명을 입력해주세요.');
      }

      if (updateData.accountName.length < 3) {
        throw new Error('계정명은 3자 이상이어야 합니다.');
      }

      if (updateData.accountName.length > 30) {
        throw new Error('계정명은 30자 이하여야 합니다.');
      }

      // 영문, 숫자, '.', '_'만 허용
      const accountNameRegex = /^[a-zA-Z0-9._]+$/;
      if (!accountNameRegex.test(updateData.accountName)) {
        throw new Error('계정명은 영문, 숫자, \'.\', \'_\'만 사용 가능합니다.');
      }

      // 백엔드 API 호출
      await profileSettingsAPI.updateProfile(updateData);
      
      // 프로필 다시 로드
      await loadUserProfile();
      
      setSuccessMessage('계정명이 성공적으로 업데이트되었습니다.');
      
      console.log('✅ 프로필 업데이트 완료');
      
      // 3초 후 성공 메시지 제거
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (error: any) {
      console.error('❌ 프로필 저장 실패:', error);
      
      let errorMessage = '프로필 저장에 실패했습니다.';
      
      if (error.response?.status === 400) {
        errorMessage = '입력한 정보가 올바르지 않습니다.';
      } else if (error.response?.status === 409) {
        errorMessage = '이미 사용 중인 계정명입니다.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, save: false }));
    }
  };

  // 변경사항 취소
  const handleCancelEdit = () => {
    if (userProfile) {
      setEditForm({
        accountName: userProfile.accountName
      });
    }
    setError(null);
    setSuccessMessage(null);
    setAccountNameCheckResult(null);
  };

  // 🔥 로그아웃 핸들러
  const handleLogout = async () => {
    if (confirm('로그아웃하시겠습니까?')) {
      try {
        setLoading(prev => ({ ...prev, logout: true }));

        await profileSettingsAPI.logoutUser();
        logout();
        router.push('/login');
        
        console.log('✅ 로그아웃 완료');
        
      } catch (error: any) {
        console.error('❌ 로그아웃 실패:', error);
        logout();
        router.push('/login');
      } finally {
        setLoading(prev => ({ ...prev, logout: false }));
      }
    }
  };

  // 🔥 계정 삭제 핸들러
  const handleDeleteAccount = async () => {
    const confirmMsg1 = '정말로 계정을 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.';
    const confirmMsg2 = '모든 게시물, 팔로우 관계, 개인 정보가 영구적으로 삭제됩니다.\n\n정말로 계속하시겠습니까?';
    
    if (confirm(confirmMsg1)) {
      if (confirm(confirmMsg2)) {
        try {
          setLoading(prev => ({ ...prev, delete: true }));

          await profileSettingsAPI.deleteAccount();
          logout();
          router.push('/login');
          
          alert('계정이 성공적으로 삭제되었습니다.');
          
          console.log('✅ 계정 삭제 완료');
          
        } catch (error: any) {
          console.error('❌ 계정 삭제 실패:', error);
          
          let errorMessage = '계정 삭제에 실패했습니다.';
          
          if (error.response?.status === 403) {
            errorMessage = '계정 삭제 권한이 없습니다.';
          } else if (error.response?.status === 409) {
            errorMessage = '현재 진행 중인 작업이 있어 계정을 삭제할 수 없습니다.';
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          alert(errorMessage);
        } finally {
          setLoading(prev => ({ ...prev, delete: false }));
        }
      }
    }
  };

  // MyRoom으로 이동
  const handleUploadSelfie = () => {
    router.push('/myroom');
  };

  // 내 프로필 페이지로 이동
  const handleViewMyProfile = () => {
    if (userProfile) {
      router.push(`/profile/${userProfile.accountName}`);
    }
  };

  // 에러 재시도
  const handleRetry = () => {
    setError(null);
    loadUserProfile();
  };

  // 변경사항이 있는지 확인
  const hasChanges = userProfile && (
    editForm.accountName.trim() !== userProfile.accountName
  );

  // 저장 가능한지 확인
  const canSave = hasChanges && 
    editForm.accountName.trim().length >= 3 && 
    editForm.accountName.trim().length <= 30 &&
    /^[a-zA-Z0-9._]+$/.test(editForm.accountName.trim()) &&
    (accountNameCheckResult?.available !== false);

  // ============================================================================
  // 🔥 렌더링
  // ============================================================================

  // 인증 로딩 중
  if (authLoading || loading.initial) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner 
          size="lg" 
          text={authLoading ? "인증 확인 중..." : "프로필을 불러오는 중..."}
        />
      </div>
    );
  }

  // 로그인하지 않은 경우
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-6">프로필 설정을 하려면 로그인해주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error && !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            title="뒤로가기"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-900">프로필 설정</h1>
            {userProfile && (
              <p className="text-xs text-gray-500">
                사용자 ID: {userProfile.userId} • @{userProfile.accountName}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={loading.save}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 disabled:opacity-50"
                  title="변경사항 취소"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={loading.save || !canSave}
                  className="p-2 rounded-full hover:bg-green-100 transition-colors text-green-600 disabled:opacity-50"
                  title="변경사항 저장"
                >
                  {loading.save ? <LoadingSpinner size="sm" /> : <CheckIcon className="w-5 h-5" />}
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
            <div className="flex items-center">
              <CheckIcon className="h-5 w-5 text-green-400 mr-3" />
              <p className="text-green-800">{successMessage}</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {userProfile && (
          <>
            {/* 프로필 사진 섹션 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <PhotoIcon className="h-5 w-5 mr-2" />
                프로필 사진
              </h2>
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-300 overflow-hidden ring-2 ring-gray-100">
                    {userProfile.userProfileImage ? (
                      <img
                        src={userProfile.userProfileImage}
                        alt={userProfile.userName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.userName)}&size=96&background=random`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                        {userProfile.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{userProfile.userName}</h3>
                  <p className="text-sm text-gray-500 mb-1">@{userProfile.accountName}</p>
                  <p className="text-xs text-gray-400 mb-3">{userProfile.userEmail}</p>
                  <div className="space-y-2">
                    <button
                      onClick={handleUploadSelfie}
                      className="block text-blue-600 text-sm hover:text-blue-700 font-medium transition-colors"
                    >
                      📸 MyRoom에서 셀피 촬영하기
                    </button>
                    <button
                      onClick={handleViewMyProfile}
                      className="block text-purple-600 text-sm hover:text-purple-700 font-medium transition-colors"
                    >
                      👤 내 프로필 페이지 보기
                    </button>
                  </div>
                </div>
              </div>

              {/* AI 보정 이미지 */}
              {userProfile.faceImageUrl && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <PhotoIcon className="h-4 w-4 mr-2" />
                    AI 보정 이미지
                  </h3>
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 ring-2 ring-purple-100">
                      <img
                        src={userProfile.faceImageUrl}
                        alt="AI 보정된 얼굴"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">AI가 보정한 얼굴 이미지</p>
                      <button
                        onClick={handleUploadSelfie}
                        className="text-blue-600 text-sm hover:text-blue-700 font-medium transition-colors"
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserCircleIcon className="h-5 w-5 mr-2" />
                기본 정보
              </h2>
              <div className="space-y-4">
                {/* 이름 (읽기 전용, 소셜 로그인 기반) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이름 (소셜 로그인 기반)
                  </label>
                  <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                    {userProfile.userName}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    소셜 로그인 계정의 이름은 변경할 수 없습니다.
                  </p>
                </div>

                {/* 계정명 (수정 가능) */}
                <div>
                  <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-1">
                    계정명 * (프로필 URL에 사용됩니다)
                  </label>
                  <input
                    type="text"
                    id="accountName"
                    value={editForm.accountName}
                    onChange={(e) => handleAccountNameChange(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="계정명을 입력하세요 (영문, 숫자, '.', '_'만 사용)"
                    maxLength={30}
                    disabled={loading.save}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <div className="flex flex-col">
                      <p className="text-xs text-gray-500">
                        3-30자 사이, 영문/숫자/'.', '_'만 사용 가능
                      </p>
                      {editForm.accountName.trim() && (
                        <p className="text-xs text-blue-600 mt-1">
                          프로필 URL: /profile/{editForm.accountName.trim()}
                        </p>
                      )}
                    </div>
                    <p className={`text-xs ${editForm.accountName.length > 25 ? 'text-red-500' : 'text-gray-400'}`}>
                      {editForm.accountName.length}/30
                    </p>
                  </div>
                  
                  {/* 계정명 중복 확인 결과 */}
                  {loading.checkAccountName && (
                    <div className="mt-2 flex items-center">
                      <LoadingSpinner size="sm" className="mr-2" />
                      <p className="text-xs text-gray-500">계정명 확인 중...</p>
                    </div>
                  )}
                  
                  {accountNameCheckResult && editForm.accountName.trim() !== userProfile.accountName && (
                    <div className={`mt-2 p-2 rounded text-xs ${
                      accountNameCheckResult.available 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      <div className="flex items-center">
                        {accountNameCheckResult.available ? (
                          <CheckIcon className="h-4 w-4 mr-1" />
                        ) : (
                          <XMarkIcon className="h-4 w-4 mr-1" />
                        )}
                        {accountNameCheckResult.message}
                      </div>
                    </div>
                  )}
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-blue-800 font-medium">계정명 변경사항이 있습니다</p>
                        <p className="text-blue-600 text-sm">
                          변경된 계정명: @{editForm.accountName.trim()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleCancelEdit}
                      disabled={loading.save}
                      className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading.save || !canSave}
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                    >
                      {loading.save ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2 inline" />
                          저장 중...
                        </>
                      ) : (
                        '계정명 저장'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 계정 정보 섹션 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CogIcon className="h-5 w-5 mr-2" />
                계정 정보
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">사용자 ID</span>
                    <span className="font-mono text-gray-800">{userProfile.userId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">현재 계정명</span>
                    <span className="font-medium bg-blue-100 px-2 py-1 rounded text-blue-700">
                      @{userProfile.accountName}
                    </span>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">프로필 URL</span>
                    <span className="font-medium text-gray-800 text-xs">
                      /profile/{userProfile.accountName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">소셜 로그인</span>
                    <span className="font-medium capitalize bg-gray-100 px-2 py-1 rounded text-gray-700">
                      연동됨
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 계정 관리 섹션 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ShieldExclamationIcon className="h-5 w-5 mr-2" />
                계정 관리
              </h2>
              <div className="space-y-3">
                <button
                  onClick={handleLogout}
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
                  onClick={handleDeleteAccount}
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
              
              {/* 계정 삭제 경고 */}
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

            {/* 추가 기능 안내 */}
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
                  onClick={handleViewMyProfile}
                  className="block w-full text-left p-2 hover:bg-blue-100 rounded transition-colors"
                >
                  👤 <strong>내 프로필 페이지</strong>에서 피드와 게시물 관리 (/profile/{userProfile.accountName})
                </button>
                <button
                  onClick={() => router.push('/feeds/timeline')}
                  className="block w-full text-left p-2 hover:bg-blue-100 rounded transition-colors"
                >
                  🏠 <strong>타임라인</strong>에서 팔로잉 사용자들의 최신 게시물 확인
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default ProfileSettingsPage