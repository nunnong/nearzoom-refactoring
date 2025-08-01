package com.ssafy.nearzoom.domain.photo.dto.webhook;

public record ImageProcessingError(
    String code,
    String message
) {}
