package com.ssafy.nearzoom.domain.photoPrompt.dto.webhook;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "이미지 처리 실패 웹훅 요청")
public record ImageProcessingFailedWebhook(

    @Schema(description = "이벤트 타입", example = "image.processing.failed", required = true)
    String event,

    @Schema(description = "작업 ID", example = "job_12345", required = true)
    String jobId,

    @Schema(description = "타임스탬프", example = "2024-08-05T12:00:00Z", required = true)
    String timestamp,

    @Schema(description = "에러 정보", required = true)
    ImageProcessingError error

) {}
