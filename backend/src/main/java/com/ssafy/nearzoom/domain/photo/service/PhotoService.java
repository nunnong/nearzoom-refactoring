package com.ssafy.nearzoom.domain.photo.service;

import com.ssafy.nearzoom.domain.photo.entity.Photo;
import com.ssafy.nearzoom.domain.photo.repository.PhotoRepository;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingCompletedWebhook;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PhotoService {

  private final PhotoRepository photoRepository;
  private final RedisTemplate<String, String> redisTemplate;

  public void saveCompletedPhoto(ImageProcessingCompletedWebhook webhook) {
    try {
      String jobId = webhook.jobId();
      String roomId = redisTemplate.opsForValue().get("job_room:" + jobId);

      if (roomId != null && webhook.data() != null) {
        String processedImageUrl = webhook.data().processedImageUrl();
        String userList = webhook.data().personIds() != null ?
            String.join(",", webhook.data().personIds()) : null;

        Photo photo = new Photo(processedImageUrl, roomId, userList);
        photoRepository.save(photo);
      }
    } catch (Exception e) {
      System.out.println("Photo 저장 실패: " + e.getMessage());
    }
  }
}
