package com.ssafy.nearzoom.domain.photoPrompt.dto.imageInfo;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "배경 정보 설정 요청 DTO")
public record BackgroundInfoRequest(

    @Schema(description = "방 ID", example = "123", required = true)
    Long roomId,

    @Schema(description = "배경 타입",
        example = "solid",
        allowableValues = {"solid", "prompt"},
        required = true)
    String backgroundType,

    @Schema(description = "단색 배경인 경우 색상 값 (hex 코드)",
        example = "#FF5733",
        pattern = "^#[0-9A-Fa-f]{6}$")
    String colorValue,

    @Schema(description = "프롬프트 배경인 경우 텍스트",
        example = "아름다운 벚꽃이 흩날리는 봄 풍경")
    String promptText,

    @Schema(description = "처리할 이미지 URL",
        example = "https://example.com/image.jpg",
        required = true)
    String imageUrl
) {}
