package com.ssafy.nearzoom.domain.room.dto;

public record TransferHostRequest(
    Long roomId,
    String newHostEmail
) {

}