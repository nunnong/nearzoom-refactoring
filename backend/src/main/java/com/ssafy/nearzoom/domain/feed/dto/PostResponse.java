package com.ssafy.nearzoom.domain.feed.dto;

import java.time.LocalDateTime;

public record PostResponse(
    Long postId,
    Long photoId,
    String imgUrl,
    String caption,
    Integer displayOrder,
    LocalDateTime createdAt,
    // 📊 좋아요 관련 정보 추가
    long likeCount,
    boolean isLikedByMe,
    // 👤 작성자 정보 추가
    Long authorId,
    String authorAccountName,
    String authorProfileImage
) {
}