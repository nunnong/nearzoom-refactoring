package com.ssafy.nearzoom.domain.feed.dto;

import java.time.LocalDateTime;
import java.util.List;

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