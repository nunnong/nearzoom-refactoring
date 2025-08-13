package com.ssafy.nearzoom.domain.feed.dto;

import java.time.LocalDateTime;
import java.util.List;

public record FeedWithPostsResponse(
    Long feedId,
    String title,
    String description,
    Long userId,
    String accountName,
    String profileImage,
    LocalDateTime createdAt,
    List<PostResponse> posts,
    boolean isFollowing
) {
}