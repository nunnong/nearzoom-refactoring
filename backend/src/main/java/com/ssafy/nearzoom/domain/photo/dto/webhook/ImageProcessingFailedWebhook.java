package com.ssafy.nearzoom.domain.photo.dto.webhook;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ImageProcessingFailedWebhook(
    String event,
    @JsonProperty("job_id") String jobId,
    String timestamp,
    ImageProcessingError error
) {}
