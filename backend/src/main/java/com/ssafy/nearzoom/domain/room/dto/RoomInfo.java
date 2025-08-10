package com.ssafy.nearzoom.domain.room.dto;

import java.util.List;

public record RoomInfo(
    Long roomId,
    String serverUrl,
    List<String> participants,
    String createdAt
) {}
