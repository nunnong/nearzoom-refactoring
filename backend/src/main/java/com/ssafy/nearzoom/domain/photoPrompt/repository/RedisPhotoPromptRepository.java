package com.ssafy.nearzoom.domain.photoPrompt.repository;

import com.ssafy.nearzoom.domain.photoPrompt.dto.BasicSettingsRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.IndividualBackgroundRequest;
import com.ssafy.nearzoom.domain.photoPrompt.dto.imageServer.ProcessingOptions;
import com.ssafy.nearzoom.domain.room.constants.RedisKeyConstants;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
@Slf4j
public class RedisPhotoPromptRepository {

    private final RedisTemplate<String, String> redisTemplate;

    public void saveSettings(BasicSettingsRequest basicSettingsRequest) {
        String roomKey = "room:" + basicSettingsRequest.roomId();

        redisTemplate.opsForHash()
            .put(roomKey, "total_images", String.valueOf(basicSettingsRequest.cutCount()));
        redisTemplate.opsForHash().put(roomKey, "frame_color", basicSettingsRequest.frameColor());
        redisTemplate.opsForHash().put(roomKey, "photo_status", "basic_settings_saved");

        redisTemplate.expire(roomKey, Duration.ofHours(RedisKeyConstants.REDIS_TTL_HOURS));
    }

    public void saveBackground(IndividualBackgroundRequest backgroundRequest, String promptId) {
        String roomKey = "room:" + backgroundRequest.roomId();

        redisTemplate.opsForHash().put(roomKey, "image_url_", backgroundRequest.imageUrl());
        redisTemplate.opsForHash()
            .put(roomKey, "background_type_", backgroundRequest.backgroundType());

        if (promptId != null) {
            redisTemplate.opsForHash().put(roomKey, "prompt_id_", promptId);
        }
    }

    public void saveIndividualJobInfo(String jobId, Long roomId,
        String imageUrl, ProcessingOptions options, String promptId) {

        String redisKey = "individual_job:" + jobId;

        log.info("📝 Redis_Individual 저장 -> Key = {}", redisKey);

        Map<String, String> jobInfo = new HashMap<>();
        jobInfo.put("room_id", String.valueOf(roomId));
        jobInfo.put("image_url", imageUrl);
        jobInfo.put("background_type", options.backgroundType());
        jobInfo.put("status", "processing");

        if (promptId != null) {
            jobInfo.put("prompt_id", promptId);
        }
        if (options.promptText() != null) {
            jobInfo.put("prompt_text", options.promptText());
        }
        if (options.backgroundColor() != null) {
            jobInfo.put("background_color", options.backgroundColor());
        }

        redisTemplate.opsForHash().putAll(redisKey, jobInfo);
        redisTemplate.expire(redisKey, Duration.ofHours(RedisKeyConstants.REDIS_TTL_HOURS));
        log.info("Redis_Individual 저장 완료");
    }

    public void saveIndividualCompletedInRoom(String roomKey, String processedImageUrl) {
        redisTemplate.opsForHash().increment(roomKey, "completed_count", 1);
        redisTemplate.opsForList().rightPush(roomKey + ":processed_urls", processedImageUrl);
    }

    public void saveFrameJobInfo(String jobId, Long roomId,
        List<String> processedImageUrls, String frameColor) {

        String redisKey = "frame_job:" + jobId;
        log.info("Redis 저장 시작 () - Key: {}", redisKey);

        Map<String, String> jobInfo = new HashMap<>();
        jobInfo.put("room_id", String.valueOf(roomId));
        jobInfo.put("processed_image_urls", String.join(",", processedImageUrls));
        jobInfo.put("frame_color", frameColor);
        jobInfo.put("job_type", "frame_compose");
        jobInfo.put("status", "processing");
        jobInfo.put("created_at", String.valueOf(System.currentTimeMillis()));

        redisTemplate.opsForHash().putAll(redisKey, jobInfo);
        redisTemplate.expire(redisKey, Duration.ofHours(RedisKeyConstants.REDIS_TTL_HOURS));
        log.info("Redis frame_job 완료");
    }

    public void saveFinalInfoToRoom(String jobId, Long roomId) {
        redisTemplate.opsForHash().put("room:" + roomId, "frame_job", jobId);
        redisTemplate.opsForHash().put("room:" + roomId, "photo_status", "frame_processing");
    }

    public void saveResultToRoom(String roomKey, String finalImageUrl) {
        redisTemplate.opsForHash().put(roomKey, "final_image_url", finalImageUrl);
        redisTemplate.opsForHash().put(roomKey, "photo_status", "all_completed");
    }
}
