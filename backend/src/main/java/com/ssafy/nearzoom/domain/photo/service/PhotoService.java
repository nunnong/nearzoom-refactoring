package com.ssafy.nearzoom.domain.photo.service;

import com.ssafy.nearzoom.domain.myroom.repository.MyPhotoMapper;
import com.ssafy.nearzoom.domain.photo.entity.Photo;
import com.ssafy.nearzoom.domain.photo.repository.PhotoRepository;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.FrameCompositionCompletedWebhook;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingCompletedWebhook;
import com.ssafy.nearzoom.domain.room.constants.RedisKeyConstants;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PhotoService {

    private final PhotoRepository photoRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final MyPhotoMapper myPhotoMapper;
    private final UserRepository userRepository;

    @Transactional
    public void saveFinalImageToDB(FrameCompositionCompletedWebhook webhook) {
        String jobId = webhook.jobId();

        Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("frame_job:" + jobId);

        Long roomId = Long.valueOf((String) jobInfo.get("room_id"));

        log.info("최종 처리된 이미지 저장 - JobId: {}, RoomId: {}", jobId, roomId);
        String finalImageUrl = webhook.data().finalImageUrl();
        log.info("finalImageUrl: {}", finalImageUrl);

        String userList = getActiveParticipantEmails(roomId);
        photoRepository.save(new Photo(finalImageUrl, roomId, userList, null));

        savePhotoPromptToArchive(finalImageUrl, userList, roomId);
    }

    @Transactional
    public void saveIndividualImageToDB(ImageProcessingCompletedWebhook webhook) {
        String jobId = webhook.jobId();

        Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("individual_job:" + jobId);

        Long roomId = Long.valueOf((String) jobInfo.get("room_id"));
        log.info("개별 처리된 이미지 저장 - JobId: {}, RoomId: {}", jobId, roomId);

        String processedImageUrl = webhook.data().processedImageUrl();

        String userList = getActiveParticipantEmails(roomId);
        photoRepository.save(new Photo(processedImageUrl, roomId, userList, null));

        savePhotoPromptToArchive(processedImageUrl, userList, roomId);
    }

    private void savePhotoPromptToArchive(String imageUrl, String userList, Long roomId) {
        log.info("saveToArchive로 들어옴");

        Photo savedPhoto = photoRepository.findByImgUrlAndRoomId(imageUrl, roomId)
            .orElseThrow(() -> new RuntimeException("저장된 Photo를 찾을 수 없습니다 - RoomId: " + roomId));

        Long photoId = savedPhoto.getPhotoId();

        String[] emailArray = userList.split(",");

        for (String email : emailArray) {
            User user = userRepository.findByUserEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다 - Email: " + email));

            Long userId = user.getUserId();

            myPhotoMapper.savePromptToArchive(userId, photoId);

            log.debug("Archive 저장 완료 - UserId: {}, PhotoId: {}, Email: {}", userId, photoId, email);
        }
    }

    private String getActiveParticipantEmails(Long roomId) {
        try {
            String participantPattern = RedisKeyConstants.PARTICIPANT_KEY_PREFIX + roomId + ":*";
            Set<String> participantKeys = redisTemplate.keys(participantPattern);

            List<String> activeEmails = new ArrayList<>();

            for (String participantKey : participantKeys) {
                Map<Object, Object> participantData = redisTemplate.opsForHash()
                    .entries(participantKey);

                if (participantData.isEmpty()) {
                    continue;
                }

                String participantStatus = (String) participantData.get("status");
                String userEmail = (String) participantData.get("userEmail");

                if ("active".equals(participantStatus) && userEmail != null && !userEmail.trim()
                    .isEmpty()) {

                    if (!activeEmails.contains(userEmail)) {
                        activeEmails.add(userEmail);
                        log.debug("활성 참가자 이메일 추가 - RoomId: {}, Email: {}", roomId, userEmail);
                    }
                }
            }

            if (activeEmails.isEmpty()) {
                log.warn("활성 참가자가 없음 - RoomId: {}", roomId);
                return null;
            }

            String emailList = String.join(",", activeEmails);
            log.info("활성 참가자 이메일 목록 생성 완료 - RoomId: {}, Count: {}, Emails: {}",
                roomId, activeEmails.size(), emailList);

            return emailList;

        } catch (Exception e) {
            log.error("참가자 이메일 목록 조회 실패 - RoomId: {}", roomId, e);
            return null;
        }
    }

    public Photo getOriginalPhotoInfo(Long originalPhotoId) {
        return photoRepository.findById(originalPhotoId)
            .orElseThrow(() -> new RuntimeException("원본 사진을 찾을 수 없습니다. ID: " + originalPhotoId));
    }

    @Transactional
    public Photo saveEditedPhoto(String editedImageUrl, Long originalPhotoId) {

        Photo originalPhoto = getOriginalPhotoInfo(originalPhotoId);

        Photo editedPhoto = new Photo(
            editedImageUrl,
            originalPhoto.getRoomId(),
            originalPhoto.getUserList(),
            originalPhotoId
        );

        editedPhoto.setTimestamps(
            originalPhoto.getCreatedAt(),
            LocalDateTime.now()
        );

        Photo savedPhoto = photoRepository.save(editedPhoto);

        return savedPhoto;
    }
}