package com.ssafy.nearzoom.domain.feed.dto;


import java.time.LocalDateTime;

public record FeedItem(
    Long feedId,
    Long userId,
    Long photoId,
    String photoUrl,
    LocalDateTime createdAt

) {

}
