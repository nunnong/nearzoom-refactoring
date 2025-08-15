package com.ssafy.nearzoom.domain.feed.dto;

import java.time.LocalDateTime;

/**
 * 게시물 응답 DTO - 마이룸의 MyPhotoResponse와 유사한 구조
 */
public record PostResponse(
    Long postId,              // 🔑 커서로 사용 (MyPhotoResponse의 photoId와 대응)
    Long photoId,
    String imgUrl,            // MyPhotoResponse의 imageUrl과 대응
    String caption,
    Integer displayOrder,
    LocalDateTime createdAt,
    // 📊 좋아요 관련 정보 (마이룸의 heart와 유사)
    long likeCount,
    boolean isLikedByMe,      // MyPhotoResponse의 heart와 대응
    // 👤 작성자 정보
    Long authorId,
    String authorAccountName,
    String authorProfileImage
) {

    /**
     * 커서 값 반환 (postId) - 마이룸의 photoId와 동일한 역할
     */
    public Long getCursor() {
        return postId;
    }
}
