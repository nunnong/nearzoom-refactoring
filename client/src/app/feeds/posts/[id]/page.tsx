'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import MyRoomHeader from '@/components/page/myroom/MyRoomHeader';
import { ArrowLeftIcon, HeartIcon, PencilIcon, UserIcon, HomeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

interface PostDetailResponse {
  postId: number;
  photoId: number;
  imgUrl: string;
  caption: string;
  createdAt: string;
  likeCount: number;
  isLikedByMe: boolean;
  authorId: number;
  authorAccountName: string;
  authorProfileImage: string | null;
  authorFeedId: number;
  isMyPost: boolean;
  isFollowingAuthor: boolean;
}

export default function PostDetailPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  
  const postId = params?.id ? Number(params.id) : null;
  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState('');

  // 게시물 로딩 (실제 API 호출)
  useEffect(() => {
    const loadPostDetail = async () => {
      if (!postId || !isAuthenticated) return;

      try {
        setLoading(true);
        setError(null);

        // 실제 API 호출
        const response = await fetch(`https://api.nearzoom.store/feeds/posts/${postId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('게시물을 불러올 수 없습니다.');
        }

        const data = await response.json();
        setPost(data);
        setEditCaption(data.caption || '');
        
      } catch (error) {
        console.error('게시물 로딩 실패:', error);
        setError('게시물을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadPostDetail();
  }, [postId, isAuthenticated]);

  const handleBack = () => {
    router.back();
  };

  const handleLike = () => {
    if (post) {
      setPost(prev => prev ? {
        ...prev,
        isLikedByMe: !prev.isLikedByMe,
        likeCount: prev.isLikedByMe ? prev.likeCount - 1 : prev.likeCount + 1
      } : null);
    }
  };

  const handleEdit = () => {
    if (post && editCaption.trim()) {
      setPost(prev => prev ? { ...prev, caption: editCaption.trim() } : null);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditCaption(post?.caption || '');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">게시물을 찾을 수 없습니다</h2>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MyRoomHeader
        onUploadSelfie={() => router.push('/upload-photo')}
        onLogout={() => router.push('/')}
        onDeleteAccount={() => router.push('/profile')}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={handleBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>뒤로 가기</span>
        </button>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* 작성자 정보 */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={post.authorProfileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorAccountName)}&size=40&background=random`}
                  alt={post.authorAccountName}
                  className="h-10 w-10 rounded-full ring-2 ring-gray-100"
                />
                <div>
                  <p className="font-medium text-gray-900">@{post.authorAccountName}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
              
              {post.isMyPost && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  내 게시물
                </span>
              )}
            </div>
          </div>

          {/* 게시물 이미지 */}
          <div className="relative">
            <img
              src={post.imgUrl}
              alt={post.caption || '게시물 이미지'}
              className="w-full h-auto max-h-screen object-contain bg-gray-100"
            />
          </div>

          {/* 좋아요 & 액션 바 */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <button
                onClick={handleLike}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-500 transition-colors"
              >
                {post.isLikedByMe ? (
                  <HeartSolidIcon className="h-6 w-6 text-red-500" />
                ) : (
                  <HeartIcon className="h-6 w-6" />
                )}
                <span className="font-medium">{post.likeCount}개의 좋아요</span>
              </button>
            </div>
          </div>

          {/* 캡션 섹션 */}
          <div className="p-4">
            {isEditing ? (
              <div className="space-y-4">
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                  rows={4}
                  placeholder="이 순간에 대해 이야기해보세요..."
                />
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleEdit}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed flex-1">
                  {post.caption || (
                    <span className="text-gray-400 italic">캡션이 없습니다.</span>
                  )}
                </p>
                
                {post.isMyPost && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="ml-3 p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 추천 액션 */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">추천</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => router.push('/timeline')}
              className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <HomeIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">타임라인</p>
                <p className="text-xs text-gray-500">최신 게시물 보기</p>
              </div>
            </button>
            
            <button
              onClick={() => router.push('/explore')}
              className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">탐색</p>
                <p className="text-xs text-gray-500">새로운 게시물 발견</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}