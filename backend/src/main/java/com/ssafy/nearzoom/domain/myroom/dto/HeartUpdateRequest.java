package com.ssafy.nearzoom.domain.myroom.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "사진 좋아요 변경 요청 DTO")
public record HeartUpdateRequest(

    @Schema(description = "사진 ID", example = "123", required = true)
    Long photoId,

    @Schema(description = "하트 여부", example = "true", required = true)
    Boolean heart
) {}
