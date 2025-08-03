package com.ssafy.nearzoom.domain.photo.dto.webhook;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ImageProcessingFailedWebhook(
    String event,
    String jobId,
    String timestamp,
    ImageProcessingError error
) {}
