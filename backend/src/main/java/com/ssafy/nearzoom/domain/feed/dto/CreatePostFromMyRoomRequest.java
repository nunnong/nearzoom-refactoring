package com.ssafy.nearzoom.domain.feed.dto;

public record CreatePostFromMyRoomRequest(
    Long photoId,
    String caption
) {
}