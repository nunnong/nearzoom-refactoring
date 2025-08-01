package com.ssafy.nearzoom.domain.photo.dto.webhook;

public record ImageProcessingResult(
    String jobId,
    String status,
    String processedImageUrl,
    String personIds,
    String errorCode,
    String errorMessage
) {}