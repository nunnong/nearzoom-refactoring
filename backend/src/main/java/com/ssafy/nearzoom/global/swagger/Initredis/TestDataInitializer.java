package com.ssafy.nearzoom.global.swagger.Initredis;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class TestDataInitializer {

  @Autowired
  private RedisTemplate<String, String> redisTemplate;

  @PostConstruct
  public void initTestData() {
    // Request Body의 roomId: 123에 맞춰서 테스트 데이터 생성
    redisTemplate.opsForHash().put("room:123", "users", "1,2,3,4");
    System.out.println("테스트 방 데이터 생성 완료: room:123");
  }
}
