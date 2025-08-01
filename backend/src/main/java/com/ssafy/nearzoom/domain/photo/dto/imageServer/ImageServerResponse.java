package com.ssafy.nearzoom.domain.photo.dto.imageServer;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ImageServerResponse(
    @JsonProperty("job_id") String jobId,
    String status,          // "pending", "success", "fail" 등
    String message          // "Processing started" 등
) {}
