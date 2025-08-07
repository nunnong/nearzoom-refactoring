package com.ssafy.nearzoom.domain.myroom.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "마이룸 사진 편집본 저장 요청 DTO")
public record PhotoEditSaveRequest(

    @Schema(description = "편집본을 저장할 사진 ID", example = "123", required = true)
    Long photoId
) {}
