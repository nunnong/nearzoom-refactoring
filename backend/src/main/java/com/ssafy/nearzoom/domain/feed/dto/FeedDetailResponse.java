package com.ssafy.nearzoom.domain.feed.dto;


import java.time.LocalDateTime;

public record FeedDetailResponse(
    Long feedId,
    Long authorId,
    Long photoId,
    String photoUrl,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

}
