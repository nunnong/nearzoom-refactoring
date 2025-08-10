package com.ssafy.nearzoom.domain.room.service;

import com.ssafy.nearzoom.domain.room.constants.RedisKeyConstants;
import com.ssafy.nearzoom.domain.room.dto.LeaveRequest;
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
import java.time.Duration;
import java.time.LocalDateTime;
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
    Long roomId = generateRoomId();

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

    isExistingRoom(roomData);

    String participantsString = (String) roomData.get("participants");
    List<String> participants = new ArrayList<>();

    if (participantsString != null && !participantsString.isEmpty()) {
      participants = Arrays.asList(participantsString.split(","));
    }

    return new RoomInfo(
        Long.parseLong((String) roomData.get("roomId")),
        (String) roomData.get("serverUrl"),
        participants,
        (String) roomData.get("createdAt")
    );
  }

  public void leaveRoom(HttpServletRequest request, LeaveRequest leaveRequest) {
    User user = validateUserFromCookie(request);

    String roomKey = RedisKeyConstants.ROOM_KEY_PREFIX + leaveRequest.roomId();
    Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

    isExistingRoom(roomData);

    try {
      // 1. 참가자 상태를 'left'로 변경
      roomRedisRepository.updateParticipantStatus(
          leaveRequest.roomId(),
          leaveRequest.participantIdentity(),
          "left"
      );

      // 2. 방의 참가자 목록에서 제거
      roomRedisRepository.removeParticipant(
          user.getUserName(),
          roomKey
      );

      // 3. LiveKit 서버에서 참가자 제거
      try {
        if (roomServiceClient != null) {
          roomServiceClient.removeParticipant(
              String.valueOf(leaveRequest.roomId()),
              leaveRequest.participantIdentity()
          ).execute();
        }
      } catch (Exception e) {
        log.warn("Failed to remove participant from LiveKit server: {}", e.getMessage());
        // LiveKit 서버 오류는 치명적이지 않으므로 계속 진행
      }

      // 4. 방에 참가자가 없으면 방 종료
      String updatedParticipants = (String) redisTemplate.opsForHash().get(roomKey, "participants");
      if (updatedParticipants == null || updatedParticipants.trim().isEmpty()) {
        closeRoom(leaveRequest.roomId());
        log.info("Room closed automatically as last participant left. RoomId: {}", leaveRequest.roomId());
      }

      log.info("User left room successfully. RoomId: {}, User: {}, Identity: {}",
          leaveRequest.roomId(), user.getUserName(), leaveRequest.participantIdentity());

    } catch (Exception e) {
      if (e instanceof ApiException) {
        throw e;
      }
      log.error("Room leave error for user: {} in room: {}", user.getUserName(), leaveRequest.roomId(), e);
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
          "방 나가기 중 오류가 발생했습니다: " + e.getMessage());
    }
  }
   // 방장이 방을 완전히 종료하는 기능
  public void closeRoom(HttpServletRequest request, Long roomId) {
    User user = validateUserFromCookie(request);

    String roomKey = RedisKeyConstants.ROOM_KEY_PREFIX + roomId;
    Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

    isExistingRoom(roomData);

    // 방장 권한 확인
    String hostEmail = (String) roomData.get("host");
    if (!user.getUserEmail().equals(hostEmail)) {
      throw new ApiException(HttpStatus.FORBIDDEN, "방을 종료할 권한이 없습니다. 방장만 방을 종료할 수 있습니다.");
    }

    closeRoom(roomId);
    log.info("Room closed by host. RoomId: {}, Host: {}", roomId, user.getUserName());
  }

  //내부적으로 방을 종료하는 로직
  private void closeRoom(Long roomId) {
    try {
      // 1. 방 상태를 'closed'로 변경
      String roomKey = RedisKeyConstants.ROOM_KEY_PREFIX + roomId;
      redisTemplate.opsForHash().put(roomKey, "status", "closed");
      redisTemplate.opsForHash().put(roomKey, "closedAt", LocalDateTime.now().toString());

      // 2. 모든 참가자 상태를 'removed'로 변경
      roomRedisRepository.closeAllParticipants(roomId);

      // 3. LiveKit 서버에서 방 종료
      try {
        if (roomServiceClient != null) {
          roomServiceClient.deleteRoom(String.valueOf(roomId)).execute();
        }
      } catch (Exception e) {
        log.warn("Failed to delete room from LiveKit server: {}", e.getMessage());
      }

      // 4. Redis에서 방 정보 TTL을 1시간으로 단축 (로그 보관용)
      redisTemplate.expire(roomKey, Duration.ofHours(1));

      log.info("Room closed and cleanup completed. RoomId: {}", roomId);

    } catch (Exception e) {
      log.error("Room closure error for roomId: {}", roomId, e);
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
          "방 종료 중 오류가 발생했습니다: " + e.getMessage());
    }
  }

  //활성 참가자 목록 조회 (나간 사람 제외)
  public List<String> getActiveParticipants(Long roomId) {
    String roomKey = RedisKeyConstants.ROOM_KEY_PREFIX + roomId;
    String participantsString = (String) redisTemplate.opsForHash().get(roomKey, "participants");

    if (participantsString == null || participantsString.trim().isEmpty()) {
      return new ArrayList<>();
    }

    return Arrays.asList(participantsString.split(","));
  }

  private static void isExistingRoom(Map<Object, Object> roomData) {
    if (roomData.isEmpty()) {
      throw new ApiException(HttpStatus.NOT_FOUND, "존재하지 않는 방입니다.");
    }
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

  private Long generateRoomId() {
    SecureRandom random = new SecureRandom();
    Long roomId;
    int maxAttempts = 10;
    int attempts = 0;

    do {
      roomId = 100000L + random.nextInt(900000); // 100000 ~ 999999
      attempts++;

      // 중복 체크
      String roomKey = RedisKeyConstants.ROOM_KEY_PREFIX + roomId;
      if (!redisTemplate.hasKey(roomKey)) {
        break;
      }

      if (attempts >= maxAttempts) {
        return System.currentTimeMillis() % 1000000L;
      }

    } while (true);

    log.info("Generated unique 6-digit roomId: {}", roomId);
    return roomId;
  }

  // 고유한 identity 생성 (단순화)
  private String generateUniqueIdentity(String baseName) {
    String timestamp = String.valueOf(System.currentTimeMillis());
    String randomSuffix = generateRandomString(6);
    return baseName + "_" + timestamp + "_" + randomSuffix;
  }

  private String generateRandomString(int identityLength) {
    String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    StringBuilder result = new StringBuilder();
    SecureRandom random = new SecureRandom();

    for (int i = 0; i < identityLength; i++) {
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