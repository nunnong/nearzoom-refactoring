package com.ssafy.nearzoom.domain.feed.dto;

import java.time.LocalDateTime;

/**
 * 게시물 상세 조회 응답 DTO - 기존 유지
 */
public record PostDetailResponse(
    // 게시물 정보
    Long postId,
    Long photoId,
    String imgUrl,
    String caption,
    LocalDateTime createdAt,

    // 좋아요 정보
    long likeCount,
    boolean isLikedByMe,

    // 작성자 정보 (피드 접근용)
    Long authorId,
    String authorAccountName,
    String authorProfileImage,
    Long authorFeedId,

    // 현재 사용자와의 관계
    boolean isMyPost,          // 내 게시물인지
    boolean isFollowingAuthor  // 작성자를 팔로우하는지
) {}