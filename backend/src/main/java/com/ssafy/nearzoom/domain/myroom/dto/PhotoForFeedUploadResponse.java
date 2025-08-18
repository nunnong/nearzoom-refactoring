package com.ssafy.nearzoom.domain.myroom.dto;

import java.time.LocalDateTime;

public record PhotoForFeedUploadResponse(
    Long photoId,
    String imgUrl,
    LocalDateTime takenAt,
    boolean alreadyInFeed
) {

}