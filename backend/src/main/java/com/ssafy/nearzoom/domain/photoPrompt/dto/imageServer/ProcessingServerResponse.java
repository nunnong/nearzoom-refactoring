package com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer;

public record ProcessingServerResponse(
    Long roomId,
    String jobId,
    String message,
    String serverResponse
) {}
