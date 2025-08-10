package com.ssafy.nearzoom.domain.room.repository;

import com.ssafy.nearzoom.domain.room.constants.RedisKeyConstants;
import com.ssafy.nearzoom.domain.room.dto.RoomMetaSaveRequest;
import com.ssafy.nearzoom.domain.user.entity.User;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import livekit.LivekitModels.Room;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

@Slf4j
@Repository
@RequiredArgsConstructor
public class RoomRedisRepository {
  private final RedisTemplate<String, String> redisTemplate;

  public void saveInitialInfo(Long roomId, String liveKitUrl, User user, Room liveKitRoom, String participantIdentity) {
    // 방 정보 저장
    Map<String, String> roomData = new HashMap<>();
    roomData.put("roomId", String.valueOf(roomId));
    roomData.put("serverUrl", liveKitUrl);
    roomData.put("host", user.getUserEmail());
    roomData.put("createdAt", LocalDateTime.now().toString());
    roomData.put("status", "active");
    roomData.put("liveKitSid", liveKitRoom.getSid());
    roomData.put("participants", user.getUserName());
    roomData.put("participantCount", "1");

    String roomKey = RedisKeyConstants.ROOM_KEY_PREFIX + roomId;
    redisTemplate.opsForHash().putAll(roomKey, roomData);
    redisTemplate.expire(roomKey, Duration.ofHours(RedisKeyConstants.REDIS_TTL_HOURS));

    // 참가자 정보 저장 (identity 기반)
    saveParticipantInfo(roomId, user.getUserName(), participantIdentity, user);

    log.info("Initial room info saved. RoomId: {}, Host: {}", roomId, user.getUserName());
  }

  public void updateRoomMetadata(RoomMetaSaveRequest roomMetaSaveRequest, String roomKey) {
    Map<String, String> metaData = new HashMap<>();
    metaData.put("participants", String.join(",", roomMetaSaveRequest.participants()));
    metaData.put("participantCount", String.valueOf(roomMetaSaveRequest.participants().size()));

    redisTemplate.opsForHash().putAll(roomKey, metaData);
    log.info("Room metadata updated for key: {}", roomKey);
  }

  public void saveParticipantInfo(Long roomId, String displayName, String identity, User user) {
    // identity 기반으로 키 생성 (고유성 보장)
    String participantKey = RedisKeyConstants.PARTICIPANT_KEY_PREFIX + roomId + ":" + identity;

    Map<String, String> participantData = new HashMap<>();
    participantData.put("displayName", displayName);
    participantData.put("participantIdentity", identity);
    participantData.put("roomId", String.valueOf(roomId));
    participantData.put("userEmail", user.getUserEmail());
    participantData.put("status", "active");
    participantData.put("joinedAt", LocalDateTime.now().toString());

    redisTemplate.opsForHash().putAll(participantKey, participantData);
    redisTemplate.expire(participantKey, Duration.ofHours(RedisKeyConstants.REDIS_TTL_HOURS));

    log.info("Participant info saved. RoomId: {}, DisplayName: {}, Identity: {}",
        roomId, displayName, identity);
  }

  public void addParticipantToRoom(String existingParticipants, String displayName, String roomKey) {
    List<String> participantList = new ArrayList<>();

    if (existingParticipants != null && !existingParticipants.isEmpty()) {
      participantList.addAll(Arrays.asList(existingParticipants.split(",")));
    }

    // 테스트를 위해 같은 이름도 허용
    participantList.add(displayName);

    redisTemplate.opsForHash().put(roomKey, "participants", String.join(",", participantList));
    redisTemplate.opsForHash().put(roomKey, "participantCount", String.valueOf(participantList.size()));

    log.info("Participant added to room. RoomKey: {}, DisplayName: {}, Total: {}",
        roomKey, displayName, participantList.size());
  }

  public void updateParticipantStatus(Long roomId, String identity, String status) {
    String participantKey = RedisKeyConstants.PARTICIPANT_KEY_PREFIX + roomId + ":" + identity;

    if (!redisTemplate.hasKey(participantKey)) {
      log.warn("Participant key not found: {}", participantKey);
      return;
    }

    redisTemplate.opsForHash().put(participantKey, "status", status);
    redisTemplate.opsForHash().put(participantKey, "updatedAt", LocalDateTime.now().toString());

    log.info("Participant status updated. RoomId: {}, Identity: {}, Status: {}",
        roomId, identity, status);
  }

  public void removeParticipant(String displayName, String roomKey) {
    String participantsString = (String) redisTemplate.opsForHash().get(roomKey, "participants");

    if (participantsString == null || participantsString.trim().isEmpty()) {
      log.warn("No participants found in room: {}", roomKey);
      return;
    }

    List<String> participantList = new ArrayList<>(Arrays.asList(participantsString.split(",")));

    // 첫 번째로 발견되는 해당 이름을 제거
    if (participantList.remove(displayName)) {
      String updatedParticipants = participantList.isEmpty() ? "" : String.join(",", participantList);

      redisTemplate.opsForHash().put(roomKey, "participants", updatedParticipants);
      redisTemplate.opsForHash().put(roomKey, "participantCount", String.valueOf(participantList.size()));

      log.info("Participant removed from room. RoomKey: {}, DisplayName: {}, Remaining: {}",
          roomKey, displayName, participantList.size());
    } else {
      log.warn("Participant not found in room participants list. RoomKey: {}, DisplayName: {}",
          roomKey, displayName);
    }
  }

  //방 종료 시 모든 참가자 상태를 'removed'로 변경
  public void closeAllParticipants(Long roomId) {
    String participantPattern = RedisKeyConstants.PARTICIPANT_KEY_PREFIX + roomId + ":*";
    Set<String> participantKeys = redisTemplate.keys(participantPattern);

    if (!participantKeys.isEmpty()) {
      for (String participantKey : participantKeys) {
        redisTemplate.opsForHash().put(participantKey, "status", "removed");
        redisTemplate.opsForHash().put(participantKey, "removedAt", LocalDateTime.now().toString());
        // 참가자 정보도 TTL 1시간으로 단축
        redisTemplate.expire(participantKey, Duration.ofHours(1));
      }

      log.info("All participants marked as removed for room: {}, Count: {}",
          roomId, participantKeys.size());
    }
  }
}