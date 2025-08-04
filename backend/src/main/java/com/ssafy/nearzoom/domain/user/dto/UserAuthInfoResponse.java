package com.ssafy.nearzoom.domain.user.dto;

import com.ssafy.nearzoom.domain.user.entity.Social;

public record UserAuthInfoResponse (
    String email,
    Social social
){}
