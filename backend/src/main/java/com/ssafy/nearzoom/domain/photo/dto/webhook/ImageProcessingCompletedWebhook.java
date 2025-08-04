package com.ssafy.nearzoom.domain.photo.dto.webhook;

public record ImageProcessingCompletedWebhook(
    String event,
    String jobId,
    String timestamp,
    ImageProcessingData data
) {}