package com.ssafy.nearzoom.domain.photo.dto.webhook;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ImageProcessingCompletedWebhook(
    String event,
    String jobId,
    String timestamp,
    ImageProcessingData data
) {}