package com.ssafy.nearzoom.domain.feed.dto;


import java.time.LocalDateTime;

public record FeedDetailResponse(
    Long feedId,
    String imgUrl,
    String caption,
    Long authorId,
    String accountName,
    String profileImage,
    LocalDateTime createdAt,
    boolean liked
) {

}
