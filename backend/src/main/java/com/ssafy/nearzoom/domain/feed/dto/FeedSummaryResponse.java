package com.ssafy.nearzoom.domain.feed.dto;

import java.time.LocalDateTime;

public record FeedSummaryResponse(
    Long feedId,
    Long photoId,
    String photoUrl,
    LocalDateTime createdAt
) {

}
