package com.ssafy.nearzoom.domain.photo.dto.imageServer;

public record ProcessingRequest(
    Long roomId,
    String processingType, // "color" | "prompt"
    String promptText,     // prompt 타입일 때만 필요
    String colorValue      // color 타입일 때만 필요
) {}
