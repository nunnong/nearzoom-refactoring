package com.ssafy.nearzoom.domain.photoPrompt.dto.webhook;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "이미지 처리 에러 정보")
public record ImageProcessingError(

    @Schema(description = "에러 코드",
        example = "PROCESSING_FAILED",
        allowableValues = {"PROCESSING_FAILED", "INVALID_FORMAT", "FILE_TOO_LARGE", "TIMEOUT"},
        required = true)
    String code,

    @Schema(description = "에러 메시지",
        example = "이미지 처리 중 알 수 없는 오류가 발생했습니다.",
        required = true)
    String message

) {}
