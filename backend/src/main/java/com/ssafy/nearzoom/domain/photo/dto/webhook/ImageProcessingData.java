package com.ssafy.nearzoom.domain.photo.dto.webhook;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record ImageProcessingData(
    @JsonProperty("original_image_id") String originalImageId,
    @JsonProperty("processed_image_url") String processedImageUrl,
    @JsonProperty("person_ids") List<String> personIds
) {}
