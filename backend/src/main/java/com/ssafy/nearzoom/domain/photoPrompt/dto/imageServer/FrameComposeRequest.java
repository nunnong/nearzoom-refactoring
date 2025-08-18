package com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record FrameComposeRequest(
    @JsonProperty("image_urls")
    List<String> processedImageUrls,
    String frameColor
) {}
