package com.ssafy.nearzoom.domain.photo.dto.imageServer;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ImageServerResponse(
        ImageServerData data
) {}
