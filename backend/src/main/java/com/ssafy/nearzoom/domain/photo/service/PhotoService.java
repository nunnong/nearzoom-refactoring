package com.ssafy.nearzoom.domain.photo.service;

import com.ssafy.nearzoom.domain.photo.entity.Photo;
import com.ssafy.nearzoom.domain.photo.repository.PhotoRepository;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingCompletedWebhook;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class PhotoService {

  private final PhotoRepository photoRepository;
  private final RedisTemplate<String, String> redisTemplate;

  public void saveCompletedPhoto(ImageProcessingCompletedWebhook webhook) {
    try {
      String jobId = webhook.jobId();

      // 1. Redis에서 roomId 가져오기
      String roomId = redisTemplate.opsForValue().get("job_room:" + jobId);

      if (roomId == null) {
        log.error("❌ job_room:{} 키를 찾을 수 없습니다. PhotoPrompt 저장 로직을 확인해주세요.", jobId);
        return;
      }

      if (webhook.data() != null) {
        String processedImageUrl = webhook.data().processedImageUrl();

        // 2. Redis에서 실제 Room 참가자 정보 가져오기
        String roomKey = "room:" + roomId;  // RoomService에서 사용하는 키 형식에 맞게
        Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

        String userList = null;
        if (!roomData.isEmpty()) {
          userList = (String) roomData.get("participants");
        }

        // userList가 없으면 personIds라도 저장 (fallback)
        if (userList == null || userList.trim().isEmpty()) {
          if (webhook.data().personIds() != null) {
            userList = String.join(",", webhook.data().personIds());
            log.warn("⚠️ Room 참가자 정보가 없어서 personIds로 대체했습니다. RoomId: {}", roomId);
          }
        }

        // 3. PHOTO 테이블에 저장
        Photo photo = new Photo(processedImageUrl, roomId, userList);
        Photo savedPhoto = photoRepository.save(photo);

        log.info("✅ PHOTO 저장 성공 - PhotoId: {}, RoomId: {}, UserList: {}",
            savedPhoto.getPhotoId(), roomId, userList);
      }

    } catch (Exception e) {
      log.error("❌ Photo 저장 실패: {}", e.getMessage(), e);
    }
  }
}
