package com.ssafy.nearzoom.domain.room.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "방장 되기 요청 DTO")
public record BecomeHostRequest(
    @Schema(description = "방 ID", example = "123456")
    Long roomId
) {
}
