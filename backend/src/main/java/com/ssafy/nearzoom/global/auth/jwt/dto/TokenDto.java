package com.ssafy.nearzoom.global.auth.jwt.dto;

public record TokenDto(

    String accessToken,
    
    String refreshToken
) {

}
