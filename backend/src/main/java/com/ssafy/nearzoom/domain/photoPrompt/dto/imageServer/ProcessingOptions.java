package com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ProcessingOptions(
    @JsonProperty("type")
    String backgroundType,

    @JsonProperty("prompt")
    String promptText,

    @JsonProperty("color")
    String backgroundColor,
    String promptId
) {

    public ProcessingOptions(String backgroundType, String promptText, String backgroundColor) {
        this(backgroundType, promptText, backgroundColor, null);
    }
}
