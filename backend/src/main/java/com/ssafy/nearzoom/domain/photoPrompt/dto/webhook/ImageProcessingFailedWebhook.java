package com.ssafy.nearzoom.domain.photoPrompt.dto.webhook;

public record ImageProcessingFailedWebhook(
    String event,
    String jobId,
    String timestamp,
    ImageProcessingError error
) {}
