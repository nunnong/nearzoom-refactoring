package com.ssafy.nearzoom.domain.photo.service;

import com.ssafy.nearzoom.domain.myroom.dto.PhotoInsertDto;
import com.ssafy.nearzoom.domain.myroom.repository.MyPhotoMapper;
import com.ssafy.nearzoom.domain.photo.entity.Photo;
import com.ssafy.nearzoom.domain.photo.repository.PhotoRepository;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.FrameCompositionCompletedWebhook;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingCompletedWebhook;
import com.ssafy.nearzoom.domain.room.constants.RedisKeyConstants;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
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

        // 각 사용자별로 MyPhoto 테이블에도 저장
        saveToMyPhotoForAllUsers(finalImageUrl, userList, roomId);
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

        // 각 사용자별로 MyPhoto 테이블에도 저장
        saveToMyPhotoForAllUsers(processedImageUrl, userList, roomId);
    }

    /**
     * 활성 참가자 이메일 목록 조회 (새로운 Redis 구조 사용)
     */
    private String getActiveParticipantEmails(Long roomId) {
        try {
            String participantPattern = RedisKeyConstants.PARTICIPANT_KEY_PREFIX + roomId + ":*";
            Set<String> participantKeys = redisTemplate.keys(participantPattern);

            List<String> activeEmails = new ArrayList<>();

            // 각 참가자 키에서 활성 상태인 사용자의 이메일만 수집
            for (String participantKey : participantKeys) {
                Map<Object, Object> participantData = redisTemplate.opsForHash().entries(participantKey);

                if (participantData.isEmpty()) {
                    continue;
                }

                String participantStatus = (String) participantData.get("status");
                String userEmail = (String) participantData.get("userEmail");

                // 활성 상태인 참가자의 이메일만 추가
                if ("active".equals(participantStatus) && userEmail != null && !userEmail.trim().isEmpty()) {
                    // 중복 체크 후 추가
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
            log.error("❌ 참가자 이메일 목록 조회 실패 - RoomId: {}", roomId, e);
            return null;
        }
    }

    /**
     * 편집본 저장을 위한 원본 Photo 정보 조회
     */
    public Photo getOriginalPhotoInfo(Long originalPhotoId) {
        return photoRepository.getById(originalPhotoId);
    }

    /**
     * 편집본 Photo 테이블 저장
     */
    @Transactional
    public Photo saveEditedPhoto(String editedImageUrl, Long originalPhotoId) {
        // 원본 Photo 정보 조회
        Photo originalPhoto = getOriginalPhotoInfo(originalPhotoId);

        // 편집본 Photo 생성 (created_at은 원본 것 사용, updated_at은 현재 시간)
        Photo editedPhoto = new Photo(editedImageUrl, originalPhoto.getRoomId(),
                originalPhoto.getUserList(), originalPhotoId);

        // created_at은 원본의 것을 사용하도록 설정
        try {
            setFieldValue(editedPhoto, "createdAt", originalPhoto.getCreatedAt());
            log.debug("편집본 Photo 생성 완료 - 원본 created_at 사용: {}", originalPhoto.getCreatedAt());
        } catch (Exception e) {
            log.warn("편집본 Photo created_at 설정 실패: {}", e.getMessage());
        }

        // DB 저장
        Photo savedPhoto = photoRepository.save(editedPhoto);
        log.info("✅ 편집본 Photo 저장 성공 - PhotoId: {}, OriginalPhotoId: {}, EditedUrl: {}",
                savedPhoto.getPhotoId(), originalPhotoId, editedImageUrl);

        return savedPhoto;
    }

    /**
     * (편집 후) Photo 저장 후 각 사용자별로 Archive 테이블에도 저장
     */




    /**
     * 리플렉션을 사용하여 필드 값 설정
     */
    private void setFieldValue(Object object, String fieldName, Object value) {
        try {
            java.lang.reflect.Field field = findField(object.getClass(), fieldName);
            if (field != null) {
                field.setAccessible(true);
                field.set(object, value);
            }
        } catch (Exception e) {
            log.debug("필드 설정 실패: {} = {}", fieldName, value);
        }
    }

    private java.lang.reflect.Field findField(Class<?> clazz, String fieldName) {
        while (clazz != null) {
            try {
                return clazz.getDeclaredField(fieldName);
            } catch (NoSuchFieldException e) {
                clazz = clazz.getSuperclass(); // 부모 클래스로 이동
            }
        }
        return null;
    }










    /**
     * (합성 후) Photo 저장 후 각 사용자별로 Archive 테이블에도 저장
     */
    private void saveToMyPhotoForAllUsers(String imageUrl, String userList, Long roomId) {


    }


}