package com.ssafy.nearzoom.domain.myroom.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "마이룸 사진 삭제 요청 DTO")
public record PhotoDeleteRequest(

    @Schema(description = "삭제할 사진 ID", example = "123", required = true)
    Long photoId
) {}
