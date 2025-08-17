package com.ssafy.nearzoom.domain.photoPrompt.dto;

public record BasicSettingsRequest(
    Long roomId,
    int cutCount,
    String frameColor
) {}
