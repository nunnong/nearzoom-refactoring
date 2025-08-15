package com.ssafy.nearzoom.domain.feed.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 사용자 피드와 게시물들을 포함한 응답 DTO
 * 마이룸 방식에 맞춰 posts를 PostListResponse로 래핑하지 않고 직접 포함
 */
public record FeedWithPostsResponse(
        Long feedId,
        Long userId,
        String accountName,
        String profileImage,
        LocalDateTime createdAt,
        List<PostResponse> posts,    // 마이룸처럼 직접 리스트
        boolean isFollowing,
        // 📱 마이룸 방식: 페이징 정보를 같은 레벨에 포함
        boolean hasNext,             // 더 많은 게시물이 있는지
        Long nextCursor              // 다음 페이지를 위한 커서
) {

    /**
     * 페이징 정보 없는 생성자 (하위 호환성)
     */
    public FeedWithPostsResponse(
            Long feedId,
            Long userId,
            String accountName,
            String profileImage,
            LocalDateTime createdAt,
            List<PostResponse> posts,
            boolean isFollowing
    ) {
        this(feedId, userId, accountName, profileImage, createdAt, posts, isFollowing, false, null);
    }

    /**
     * 페이징 정보 포함 생성자
     */
    public static FeedWithPostsResponse withPaging(
            Long feedId,
            Long userId,
            String accountName,
            String profileImage,
            LocalDateTime createdAt,
            List<PostResponse> posts,
            boolean isFollowing,
            boolean hasNext,
            Long nextCursor
    ) {
        return new FeedWithPostsResponse(
                feedId, userId, accountName, profileImage, createdAt,
                posts, isFollowing, hasNext, nextCursor
        );
    }
}