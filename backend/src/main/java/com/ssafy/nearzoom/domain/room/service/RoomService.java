package com.ssafy.nearzoom.domain.room.service;

import com.ssafy.nearzoom.domain.room.constants.RedisKeyConstants;
import com.ssafy.nearzoom.domain.room.dto.LiveKitInfoResponse;
import com.ssafy.nearzoom.domain.room.dto.RoomInfo;
import com.ssafy.nearzoom.domain.room.dto.JoinRequest;
import com.ssafy.nearzoom.domain.room.dto.RoomMetaSaveRequest;
import com.ssafy.nearzoom.domain.room.repository.RoomRedisRepository;
import com.ssafy.nearzoom.domain.user.entity.Social;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.jwt.JWTUtil;
import com.ssafy.nearzoom.global.exception.ApiException;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.Jwts.SIG;
import io.livekit.server.RoomServiceClient;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import livekit.LivekitModels;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import retrofit2.Response;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoomService {

  private final JWTUtil jwtUtil;
  private final UserRepository userRepository;
  private final RoomRedisRepository roomRedisRepository;
  private final RedisTemplate<String, String> redisTemplate;

  @Value("${livekit.api.key}")
  private String apiKey;

  @Value("${livekit.api.secret}")
  private String apiSecret;

  @Value("${livekit.url}")
  private String liveKitUrl;

  private RoomServiceClient roomServiceClient;

  @PostConstruct
  public void init() {
    try {
      String httpUrl = convertWssToHttps(liveKitUrl);
      this.roomServiceClient = RoomServiceClient.createClient(httpUrl, apiKey, apiSecret);
      log.info("LiveKit RoomServiceClient created successfully with URL: {}", httpUrl);
    } catch (Exception e) {
      log.error("LiveKit client creation failed", e);
      throw new IllegalStateException("LiveKit 서비스 초기화에 실패했습니다.", e);
    }
  }

  private String convertWssToHttps(String wssUrl) {
    if (wssUrl == null) {
      throw new IllegalArgumentException("LiveKit URL이 설정되지 않았습니다.");
    }

    if (wssUrl.startsWith("wss://")) {
      return wssUrl.replace("wss://", "https://");
    } else if (wssUrl.startsWith("ws://")) {
      return wssUrl.replace("ws://", "http://");
    } else if (wssUrl.startsWith("http://") || wssUrl.startsWith("https://")) {
      return wssUrl;
    } else {
      return "https://" + wssUrl;
    }
  }

  public LiveKitInfoResponse createRoom(HttpServletRequest request, String metadata)
      throws IOException {
    User user = validateUserFromCookie(request);
    Long roomId = System.currentTimeMillis();

    try {
      if (roomServiceClient == null) {
        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
            "LiveKit 서비스가 현재 사용할 수 없습니다.");
      }

      Response<LivekitModels.Room> response = roomServiceClient.createRoom(String.valueOf(roomId)).execute();

      if (!response.isSuccessful()) {
        log.error("LiveKit room creation failed. Response code: {}, message: {}",
            response.code(), response.message());
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
            "LiveKit 서버에서 방 생성에 실패했습니다: " + response.message());
      }

      LivekitModels.Room liveKitRoom = response.body();
      if (liveKitRoom == null) {
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "LiveKit 서버 응답이 비어있습니다.");
      }

      // identity 기반으로 고유 키 생성
      String participantIdentity = generateUniqueIdentity(user.getUserName());
      String liveKitToken = createLiveKitToken(
          user.getUserName(),
          participantIdentity,
          roomId,
          metadata
      );

      roomRedisRepository.saveInitialInfo(
          roomId,
          liveKitUrl,
          user,
          liveKitRoom,
          participantIdentity);

      log.info("Room created successfully. RoomId: {}, User: {}", roomId, user.getUserName());

      return new LiveKitInfoResponse(
          liveKitUrl,
          roomId,
          liveKitToken,
          user.getUserName()
      );

    } catch (Exception e) {
      if (e instanceof ApiException) {
        throw e;
      }
      log.error("Room creation error for user: {}", user.getUserName(), e);
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
          "방 생성 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  public LiveKitInfoResponse joinRoom(HttpServletRequest request, JoinRequest joinRequest) {
    User user = validateUserFromCookie(request);

    String roomKey = RedisKeyConstants.ROOM_KEY_PREFIX + joinRequest.roomId();
    Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);
    if (roomData.isEmpty()) {
      throw new ApiException(HttpStatus.NOT_FOUND, "존재하지 않는 방입니다. 초대 URL을 다시 확인해주세요.");
    }

    String roomStatus = (String) roomData.get("status");
    if (!"active".equals(roomStatus)) {
      throw new ApiException(HttpStatus.GONE, "이미 종료된 방입니다.");
    }

    // 고유한 identity 생성 (테스트를 위해 같은 이름도 허용)
    String participantIdentity = generateUniqueIdentity(user.getUserName());

    try {
      String participantToken = createLiveKitToken(
          user.getUserName(),
          participantIdentity,
          joinRequest.roomId(),
          joinRequest.metadata()
      );

      // identity 기반으로 참가자 정보 저장
      roomRedisRepository.saveParticipantInfo(joinRequest.roomId(), user.getUserName(), participantIdentity, user);

      // 방 정보 업데이트
      String existingParticipants = (String) roomData.get("participants");
      roomRedisRepository.addParticipantToRoom(existingParticipants, user.getUserName(), roomKey);

      log.info("User joined room successfully. RoomId: {}, User: {}, Identity: {}",
          joinRequest.roomId(), user.getUserName(), participantIdentity);

      return new LiveKitInfoResponse(
          liveKitUrl,
          joinRequest.roomId(),
          participantToken,
          user.getUserName()
      );

    } catch (Exception e) {
      if (e instanceof ApiException) {
        throw e;
      }
      log.error("Room join error for user: {} in room: {}", user.getUserName(), joinRequest.roomId(), e);
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
          "방 참가 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  public void saveRoomMeta(RoomMetaSaveRequest roomMetaSaveRequest) {
    String roomKey = RedisKeyConstants.ROOM_KEY_PREFIX + roomMetaSaveRequest.roomId();

    if (!redisTemplate.hasKey(roomKey)) {
      throw new ApiException(HttpStatus.NOT_FOUND, "존재하지 않는 방입니다.");
    }

    roomRedisRepository.updateRoomMetadata(roomMetaSaveRequest, roomKey);
    log.info("Room metadata updated. RoomId: {}", roomMetaSaveRequest.roomId());
  }

  public RoomInfo getRoomInfo(HttpServletRequest request, Long roomId) {
    validateUserFromCookie(request);

    String roomKey = RedisKeyConstants.ROOM_KEY_PREFIX + roomId;
    Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

    if (roomData.isEmpty()) {
      throw new ApiException(HttpStatus.NOT_FOUND, "존재하지 않는 방입니다.");
    }

    String participantsString = (String) roomData.get("participants");
    List<String> participants = new ArrayList<>();

    if (participantsString != null && !participantsString.isEmpty()) {
      participants = Arrays.asList(participantsString.split(","));
    }

    return new RoomInfo(
        (Long) roomData.get("roomId"),
        (String) roomData.get("serverUrl"),
        participants,
        (String) roomData.get("createdAt")
    );
  }

  private String createLiveKitToken(String displayName, String identity, Long roomId, String metadata) {
    try {
      long now = System.currentTimeMillis();
      long exp = System.currentTimeMillis() + (RedisKeyConstants.TOKEN_TTL_MINUTES * 60 * 1000);

      Map<String, Object> videoGrant = new HashMap<>();
      videoGrant.put("room", String.valueOf(roomId));
      videoGrant.put("roomJoin", true);
      videoGrant.put("canPublish", true);
      videoGrant.put("canSubscribe", true);
      videoGrant.put("canPublishData", true);

      SecretKey liveKitSecretKey = new SecretKeySpec(
          apiSecret.getBytes(StandardCharsets.UTF_8),
          SIG.HS256.key().build().getAlgorithm()
      );

      JwtBuilder builder = Jwts.builder()
          .claim("iss", apiKey)
          .claim("sub", identity)
          .claim("name", displayName)
          .claim("video", videoGrant)
          .issuedAt(new Date(now))
          .expiration(new Date(exp))
          .signWith(liveKitSecretKey);

      if (metadata != null && !metadata.trim().isEmpty()) {
        builder.claim("metadata", metadata);
      }

      return builder.compact();

    } catch (Exception e) {
      log.error("Token creation failed for identity: {}", identity, e);
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
          "토큰 생성 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  // 고유한 identity 생성 (단순화)
  private String generateUniqueIdentity(String baseName) {
    String timestamp = String.valueOf(System.currentTimeMillis());
    String randomSuffix = generateRandomString();
    return baseName + "_" + timestamp + "_" + randomSuffix;
  }

  private String generateRandomString() {
    String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    StringBuilder result = new StringBuilder();
    SecureRandom random = new SecureRandom();

    for (int i = 0; i < 6; i++) {
      result.append(chars.charAt(random.nextInt(chars.length())));
    }

    return result.toString();
  }

  private User validateUserFromCookie(HttpServletRequest request) {
    Cookie[] cookies = request.getCookies();
    String accessToken = null;

    if (cookies != null) {
      for (Cookie cookie : cookies) {
        if ("accessToken".equals(cookie.getName()) || "jwt".equals(cookie.getName())) {
          accessToken = cookie.getValue();
          break;
        }
      }
    }

    if (accessToken == null || accessToken.trim().isEmpty()) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "인증 토큰이 필요합니다.");
    }

    try {
      String email = jwtUtil.getEmail(accessToken);
      Social social = jwtUtil.getSocial(accessToken);

      return userRepository.getByEmailAndSocial(email, social);

    } catch (Exception e) {
      log.warn("Invalid token validation attempt from IP: {}", request.getRemoteAddr());
      throw new ApiException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 토큰입니다.");
    }
  }
}