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

    // 각 사용자별로 Archive 테이블에도 저장
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

<<<<<<< HEAD
  /**
   * 개별 처리된 이미지 저장 (명시적 메소드명) - 호환성을 위해 수정
   */
  @Transactional
  public void saveIndividualProcessedPhoto(ImageProcessingCompletedWebhook webhook) {
    // 새로운 메소드로 변경
    saveIndividualImageToDB(webhook);
  }

  /**
   * 최종 합성된 이미지 저장 (호환성을 위한 별칭)
   */
  @Transactional
  public void saveFinalComposedPhoto(FrameCompositionCompletedWebhook webhook) {
    saveFinalImageToDB(webhook);
  }

  /**
   * 활성 참가자 이메일 목록 조회 (새로운 Redis 구조 사용)
   */
  private String getActiveParticipantEmails(Long roomId) {
    try {
      String participantPattern = RedisKeyConstants.PARTICIPANT_KEY_PREFIX + roomId + ":*";
      Set<String> participantKeys = redisTemplate.keys(participantPattern);
=======
    /**
     * 활성 참가자 이메일 목록 조회 (새로운 Redis 구조 사용)
     */
    private String getActiveParticipantEmails(Long roomId) {
        try {
            String participantPattern = RedisKeyConstants.PARTICIPANT_KEY_PREFIX + roomId + ":*";
            Set<String> participantKeys = redisTemplate.keys(participantPattern);
>>>>>>> deb600e4cddd1ee6affdcbada690ba715e4f3f50

      List<String> activeEmails = new ArrayList<>();

      // 각 참가자 키에서 활성 상태인 사용자의 이메일만 수집
      for (String participantKey : participantKeys) {
        Map<Object, Object> participantData = redisTemplate.opsForHash().entries(participantKey);

<<<<<<< HEAD
        if (participantData.isEmpty()) {
          continue;
=======
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
>>>>>>> deb600e4cddd1ee6affdcbada690ba715e4f3f50
        }

        String participantStatus = (String) participantData.get("status");
        String userEmail = (String) participantData.get("userEmail");

<<<<<<< HEAD
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
=======
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
>>>>>>> deb600e4cddd1ee6affdcbada690ba715e4f3f50
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
    return photoRepository.findById(originalPhotoId)
            .orElseThrow(() -> new RuntimeException("원본 사진을 찾을 수 없습니다. ID: " + originalPhotoId));
  }

  /**
   * 편집본 Photo 저장
   */
  @Transactional
  public Photo saveEditedPhoto(String editedImageUrl, Long originalPhotoId) {
    // 원본 Photo 정보 조회
    Photo originalPhoto = getOriginalPhotoInfo(originalPhotoId);

    // 편집본 Photo 생성
    // - imgUrl: 편집된 이미지 URL
    // - roomId: 원본과 동일한 방 ID
    // - userList: 원본과 동일한 사용자 목록
    // - originalPhotoId: 원본 사진 ID (편집본임을 표시)
    Photo editedPhoto = new Photo(
        editedImageUrl,           // 편집된 이미지 URL
        originalPhoto.getRoomId(), // 원본과 동일한 방 ID
        originalPhoto.getUserList(), // 원본과 동일한 사용자 목록
        originalPhotoId            // 원본 사진 ID
    );

    // 시간 필드 설정
    // - createdAt: 원본 사진의 생성 시간
    // - updatedAt: 현재 시간 (편집한 시간)
    editedPhoto.setTimestamps(
        originalPhoto.getCreatedAt(), // 원본 사진의 생성 시간
        LocalDateTime.now()           // 현재 시간 (편집한 시간)
    );

    // DB 저장
    Photo savedPhoto = photoRepository.save(editedPhoto);
    
    return savedPhoto;
  }

  /**
   * Photo 저장 후 각 사용자별로 Archive 테이블에도 저장
   */
  
  private void saveToMyPhotoForAllUsers(String imageUrl, String userList, Long roomId) {
    if (userList == null || userList.trim().isEmpty()) {
      log.warn("userList가 비어있어서 Archive 저장을 건너뜁니다.");
      return;
    }

<<<<<<< HEAD
    try {
      // userList에서 이메일 추출 (쉼표로 구분)
      List<String> userEmails = Arrays.asList(userList.split(","));

      for (String email : userEmails) {
        String trimmedEmail = email.trim();
        if (trimmedEmail.isEmpty()) {
          continue;
        }

        try {
          // 사용자 ID 조회
          Long userId = userRepository.findByUserEmail(trimmedEmail)
                  .map(user -> user.getUserId())
                  .orElse(null);

          if (userId != null) {
            // Photo 테이블에 저장
            PhotoInsertDto photoDto = new PhotoInsertDto(imageUrl, userList, roomId, null);
            myPhotoMapper.savePhotoToMyPhoto(photoDto);

            // Archive 테이블에 저장
            myPhotoMapper.saveToArchive(userId, photoDto.getPhotoId());
            log.debug("✅ Photo 및 Archive 저장 성공 - userId: {}, email: {}, imageUrl: {}",
                    userId, trimmedEmail, imageUrl);
          } else {
            log.warn("⚠️ 사용자를 찾을 수 없습니다 - email: {}", trimmedEmail);
          }

        } catch (Exception e) {
          log.error("❌ 개별 사용자 Archive 저장 실패 - email: {}, error: {}", trimmedEmail, e.getMessage());
        }
      }

      log.info("✅ 모든 사용자 Archive 저장 완료 - userCount: {}, imageUrl: {}", userEmails.size(), imageUrl);

    } catch (Exception e) {
      log.error("❌ Archive 저장 중 전체 오류 - imageUrl: {}, userList: {}, error: {}", imageUrl, userList, e.getMessage());
    }
  }
=======









    /**
     * (합성 후) Photo 저장 후 각 사용자별로 Archive 테이블에도 저장
     */
    private void saveToMyPhotoForAllUsers(String imageUrl, String userList, Long roomId) {


    }


>>>>>>> deb600e4cddd1ee6affdcbada690ba715e4f3f50
}