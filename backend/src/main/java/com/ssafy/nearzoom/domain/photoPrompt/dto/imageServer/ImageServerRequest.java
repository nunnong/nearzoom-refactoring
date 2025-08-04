package com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record ImageServerRequest(
    @JsonProperty("image_url")
    String imageUrl,
    @JsonProperty("person_ids")
    List<String> personIds,
    @JsonProperty("processing_options")
    ProcessingOptions processingOptions
) {}
