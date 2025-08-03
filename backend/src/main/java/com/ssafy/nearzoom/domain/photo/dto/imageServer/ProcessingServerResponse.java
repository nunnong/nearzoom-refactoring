package com.ssafy.nearzoom.domain.photo.dto.imageServer;

public record ProcessingServerResponse(
    String roomId,
    String jobId,
    String message,
    String serverResponse
) {}
