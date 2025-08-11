package com.ssafy.nearzoom.domain.room.dto;

public record TransferHostRequest(
    Long roomId,
    String newHostEmail  // 새로운 방장의 이메일
) {}