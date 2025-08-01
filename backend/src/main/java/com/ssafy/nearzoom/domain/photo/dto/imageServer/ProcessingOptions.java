package com.ssafy.nearzoom.domain.photo.dto.imageServer;

public record ProcessingOptions(
    String type,        // "color" | "prompt"
    String prompt,      // 선택사항
    String color        // 선택사항
) {}

