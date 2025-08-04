package com.ssafy.nearzoom.domain.photoPrompt.dto.webhook;

public record ImageProcessingCompletedWebhook(
    String event,
    String jobId,
    String timestamp,
    ImageProcessingData data
) {}