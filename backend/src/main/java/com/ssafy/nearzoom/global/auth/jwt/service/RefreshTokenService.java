package com.ssafy.nearzoom.global.auth.jwt.service;

import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RedisTemplate<String, String> redisTemplate;

    @Value("${spring.jwt.refresh-token-ttl}")
    private long refreshTokenTtl;

    public void save(String email, String token) {
        redisTemplate.opsForValue().set(email, token, refreshTokenTtl, TimeUnit.SECONDS);
    }

    public String get(String email) {
        return redisTemplate.opsForValue().get(email);
    }

    public void delete(String email) {
        redisTemplate.delete(email);
    }
}
