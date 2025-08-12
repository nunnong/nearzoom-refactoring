import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  displayName: string;
  profileImage?: string;
  isFollowing?: boolean;
  bio?: string;
}

interface FollowListModalProps {
  userId: string;
  type: 'followers' | 'following';
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

const FollowListModal: React.FC<FollowListModalProps> = ({
  userId,
  type,
  isOpen,
  onClose,
  currentUserId
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 🔥 Mock 데이터 생성 함수
  const generateMockUsers = (type: 'followers' | 'following', count: number = 8): User[] => {
    const mockNames = [
      '김다꾸', '이예쁜', '박감성', '정아름', '최귀염', 
      '문달콤', '홍매력', '신반짝', '조사랑', '윤행복',
      '한순간', '강빛나', '유꿈나', '서웃음', '노희망'
    ];
    
    const mockBios = [
      '매일매일 작은 행복을 찾아가며 살아요 ✨',
      '일상 속 소소한 감동들을 기록하는 공간 📝',
      '좋은 사람들과 함께하는 즐거운 하루하루 💕',
      '예쁘고 귀여운 것들로 가득한 나만의 세상 🌸',
      '달콤하고 따뜻한 순간들의 기록장 🍯',
      '감성 가득한 일상을 담아내는 중 🎨',
      '오늘도 좋은 하루 되세요! 😊',
      '소중한 추억들을 차곡차곡 모아가요 📷',
    ];

    return Array.from({ length: count }, (_, index) => {
      const randomIndex = (index + parseInt(userId.slice(-1))) % mockNames.length;
      const name = mockNames[randomIndex];
      const username = name.toLowerCase().replace(/\s+/g, '');
      
      return {
        id: `user_${type}_${index}_${userId}`,
        username,
        displayName: name,
        profileImage: Math.random() > 0.3 ? `/api/placeholder/48/48?seed=${username}` : undefined,
        isFollowing: Math.random() > 0.4, // 60% 확률로 팔로잉 중
        bio: mockBios[index % mockBios.length],
      };
    });
  };

  // 팔로워/팔로잉 리스트 가져오기
  useEffect(() => {
    if (!isOpen) return;

    const fetchList = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 🔥 실제 API 호출 시도
        try {
          const response = await fetch(`/api/users/${userId}/${type}`);
          if (response.ok) {
            const data = await response.json();
            setUsers(data);
            setLoading(false);
            return;
          }
        } catch (apiError) {
          console.log('API 엔드포인트가 없어서 Mock 데이터를 사용합니다.');
        }
        
        // 🔥 API 실패 시 Mock 데이터 사용
        setTimeout(() => {
          const mockUsers = generateMockUsers(type, Math.floor(Math.random() * 10) + 3);
          setUsers(mockUsers);
          setLoading(false);
        }, 800); // 실제 API 호출처럼 딜레이 추가
        
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        setLoading(false);
      }
    };

    fetchList();
  }, [userId, type, isOpen]);

  // 사용자 클릭 시 해당 피드로 이동
  const handleUserClick = (clickedUserId: string) => {
    onClose(); // 모달 먼저 닫기
    router.push(`/feed/${clickedUserId}`); // 해당 사용자 피드로 이동
  };

  // 팔로우/언팔로우 토글
  const handleFollowToggle = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    if (!currentUserId) return;

    try {
      // 🔥 실제 API 호출 시도
      try {
        const method = isCurrentlyFollowing ? 'DELETE' : 'POST';
        const response = await fetch(`/api/users/${targetUserId}/follow`, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          // API 성공 시 상태 업데이트
          setUsers(prevUsers =>
            prevUsers.map(user =>
              user.id === targetUserId
                ? { ...user, isFollowing: !isCurrentlyFollowing }
                : user
            )
          );
          return;
        }
      } catch (apiError) {
        console.log('팔로우 API가 없어서 로컬 상태만 업데이트합니다.');
      }

      // 🔥 API 실패 시 로컬 상태만 업데이트 (Mock)
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === targetUserId
            ? { ...user, isFollowing: !isCurrentlyFollowing }
            : user
        )
      );
    } catch (err) {
      console.error('팔로우 상태 변경 실패:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {type === 'followers' ? '팔로워' : '팔로잉'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">불러오는 중...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-red-500">
              <span>{error}</span>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <span>
                {type === 'followers' ? '팔로워가' : '팔로잉이'} 없습니다.
              </span>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {/* 프로필 이미지 */}
                  <div
                    className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer overflow-hidden"
                    onClick={() => handleUserClick(user.id)}
                  >
                    {user.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt={user.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400">👤</span>
                    )}
                  </div>

                  {/* 사용자 정보 */}
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleUserClick(user.id)}
                  >
                    <div className="font-medium text-gray-900">
                      {user.displayName}
                    </div>
                    <div className="text-sm text-gray-500">
                      @{user.username}
                    </div>
                    {user.bio && (
                      <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                        {user.bio}
                      </div>
                    )}
                  </div>

                  {/* 팔로우 버튼 (본인이 아닌 경우만 표시) */}
                  {currentUserId && user.id !== currentUserId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFollowToggle(user.id, user.isFollowing || false);
                      }}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        user.isFollowing
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {user.isFollowing ? '팔로잉' : '팔로우'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🔥 개발용 정보 표시 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="px-4 py-2 bg-yellow-50 border-t text-xs text-yellow-800">
            💡 개발용: Mock 데이터 사용 중 (백엔드 연결 후 실제 데이터로 교체됨)
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowListModal;