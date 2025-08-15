package com.ssafy.nearzoom.domain.myroom.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "마이룸 사진 편집본 저장 요청 DTO")
public record PhotoEditSaveRequest(

        @Schema(description = "편집본 이미지 URL", example = "https://image-server.com/edited/123.jpg", required = true)
        String imgUrl,

        @Schema(description = "원본 사진 ID", example = "123", required = true)
        Long originalPhotoId

) {}
