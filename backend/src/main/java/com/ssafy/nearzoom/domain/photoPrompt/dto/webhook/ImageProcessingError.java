package com.ssafy.nearzoom.domain.photoPrompt.dto.webhook;

public record ImageProcessingError(
    String code,
    String message
) {}
