package com.ssafy.nearzoom.domain.photo.dto.imageServer;

public record ProcessingServerResponse(
    Long roomId,
    String jobId,
    String message,
    String serverResponse
) {}
