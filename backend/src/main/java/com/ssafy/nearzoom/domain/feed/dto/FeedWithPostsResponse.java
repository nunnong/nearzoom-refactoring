package com.ssafy.nearzoom.domain.feed.dto;

import java.time.LocalDateTime;
import java.util.List;

public record FeedWithPostsResponse(
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