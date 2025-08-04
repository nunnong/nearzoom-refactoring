package com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ImageServerData(
        @JsonProperty("job_id") String jobId,
        String status,
        @JsonProperty("created_at") String createdAt
) {}
