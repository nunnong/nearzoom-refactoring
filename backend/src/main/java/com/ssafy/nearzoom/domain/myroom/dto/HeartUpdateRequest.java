package com.ssafy.nearzoom.domain.myroom.dto;

public record HeartUpdateRequest(
    Long photoId,
    Boolean heart
) {
}
