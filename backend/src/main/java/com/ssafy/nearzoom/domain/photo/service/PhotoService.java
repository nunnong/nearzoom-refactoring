package com.ssafy.nearzoom.domain.photo.service;

import com.ssafy.nearzoom.domain.myroom.dto.PhotoInsertDto;
import com.ssafy.nearzoom.domain.myroom.repository.MyPhotoMapper;
import com.ssafy.nearzoom.domain.photo.entity.Photo;
import com.ssafy.nearzoom.domain.photo.repository.PhotoRepository;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.FrameCompositionCompletedWebhook;
import com.ssafy.nearzoom.domain.photoPrompt.dto.webhook.ImageProcessingCompletedWebhook;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
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
    public void saveFinalComposedPhoto(FrameCompositionCompletedWebhook webhook) {
        String jobId = webhook.jobId();
        long startTime = System.currentTimeMillis();

        log.info("=== 🖼️ 최종 합성 이미지 Photo 저장 시작 ===");
        log.info("JobId: {}", jobId);
        log.info("Event: {}", webhook.event());
        log.info("Timestamp: {}", webhook.timestamp());

        try {
            // 1️⃣ 웹훅 데이터 검증
            log.info("=== 1️⃣ 웹훅 데이터 검증 ===");
            if (webhook.data() == null) {
                log.error("❌ 웹훅 데이터가 null입니다!");
                return;
            }

            String finalImageUrl = webhook.data().finalImageUrl();
            log.info("Final Image URL: {}", finalImageUrl);

            if (finalImageUrl == null || finalImageUrl.trim().isEmpty()) {
                log.error("❌ finalImageUrl이 비어있습니다!");
                return;
            }

            List<String> individualImageUrls = webhook.data().individualImageUrls();
            log.info("Individual Image URLs: {}", individualImageUrls);

            if (webhook.data().frameInfo() != null) {
                log.info("Frame Info - Color: {}, Layout: {}",
                    webhook.data().frameInfo().color(),
                    webhook.data().frameInfo().layout());
            }

            // 2️⃣ Redis에서 frame job 정보 가져오기
            log.info("=== 2️⃣ Frame Job 정보 조회 ===");
            Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("frame_job:" + jobId);
            log.info("Frame Job 정보 개수: {}", jobInfo.size());

            if (jobInfo.isEmpty()) {
                log.error("❌ Frame Job 정보를 찾을 수 없습니다 - JobId: {}", jobId);

                // 🔍 대안: Room에서 JobId 찾기
                log.info("=== 대안: Room에서 JobId 찾기 ===");
                Set<String> roomKeys = redisTemplate.keys("room:*");
                log.info("검색할 Room 키 개수: {}", roomKeys.size());

                Long foundRoomId = null;
                for (String roomKey : roomKeys) {
                    Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);
                    String composeJobId = (String) roomData.get("compose_job_id");
                    if (jobId.equals(composeJobId)) {
                        foundRoomId = Long.valueOf(roomKey.replace("room:", ""));
                        log.info("✅ Room에서 JobId 발견! RoomId: {}", foundRoomId);
                        break;
                    }
                }

                if (foundRoomId == null) {
                    log.error("❌ Room에서도 JobId를 찾을 수 없음");
                    return;
                }

                // 임시로 jobInfo 생성
                jobInfo = Map.of("room_id", foundRoomId.toString());
            }

            Long roomId = Long.valueOf((String) jobInfo.get("room_id"));
            log.info("✅ RoomId 확인: {}", roomId);

            // 3️⃣ Redis에서 Room 정보 가져오기
            log.info("=== 3️⃣ Room 정보 조회 ===");
            String roomKey = "room:" + roomId;
            log.info("Room Key: {}", roomKey);

            Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);
            log.info("Room Data 개수: {}", roomData.size());

            if (!roomData.isEmpty()) {
                log.info("Room Data 내용:");
                for (Map.Entry<Object, Object> entry : roomData.entrySet()) {
                    log.info("  {}: {}", entry.getKey(), entry.getValue());
                }
            }

            String userList = null;
            LocalDateTime roomCreatedAt = LocalDateTime.now();

            if (!roomData.isEmpty()) {
                // 참가자 정보 추출
                userList = (String) roomData.get("participants");
                log.info("Room 참가자 정보: '{}'", userList);

                // 방 생성 시간 추출
                String roomCreatedAtStr = (String) roomData.get("createdAt");
                log.info("Room 생성 시간 문자열: '{}'", roomCreatedAtStr);

                if (roomCreatedAtStr != null && !roomCreatedAtStr.trim().isEmpty()) {
                    try {
                        roomCreatedAt = LocalDateTime.parse(roomCreatedAtStr);
                        log.info("✅ 방 생성 시간 파싱 성공: {}", roomCreatedAt);
                    } catch (Exception e) {
                        log.warn("⚠️ 방 생성 시간 파싱 실패, 현재 시간 사용: {}", e.getMessage());
                        roomCreatedAt = LocalDateTime.now();
                    }
                } else {
                    log.warn("⚠️ Room에 createdAt 정보가 없음, 현재 시간 사용");
                    roomCreatedAt = LocalDateTime.now();
                }
            } else {
                log.warn("⚠️ Room 데이터가 비어있음");
            }

            // UserList 검증 및 fallback
            if (userList == null || userList.trim().isEmpty()) {
                userList = "";
                log.warn("⚠️ Room 참가자 정보가 없어서 빈 문자열로 설정");
            }

            // 4️⃣ Photo 객체 생성
            log.info("=== 4️⃣ Photo 객체 생성 ===");
            log.info("생성할 Photo 정보:");
            log.info("  finalImageUrl: {}", finalImageUrl);
            log.info("  roomId: {}", roomId);
            log.info("  userList: '{}'", userList);
            log.info("  roomCreatedAt: {}", roomCreatedAt);

            Photo photo = createPhotoWithTimestamp(finalImageUrl, roomId, userList, roomCreatedAt);

            log.info("생성된 Photo 객체:");
            log.info("  ImgUrl: {}", photo.getImgUrl());
            log.info("  RoomId: {}", photo.getRoomId());
            log.info("  UserList: '{}'", photo.getUserList());
            log.info("  OriginalPhotoId: {}", photo.getOriginalPhotoId());

            // 5️⃣ DB 저장 시도
            log.info("=== 5️⃣ Photo DB 저장 시도 ===");
            log.info("저장 전 트랜잭션 상태 확인...");

            try {
                boolean isTransactionActive = org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive();
                log.info("트랜잭션 활성 상태: {}", isTransactionActive);

                String transactionName = org.springframework.transaction.support.TransactionSynchronizationManager.getCurrentTransactionName();
                log.info("현재 트랜잭션 이름: {}", transactionName);
            } catch (Exception e) {
                log.warn("트랜잭션 상태 확인 실패: {}", e.getMessage());
            }

            Photo savedPhoto = photoRepository.save(photo);

            log.info("=== ✅ Photo DB 저장 성공! ===");
            log.info("저장된 Photo 상세 정보:");
            log.info("  PhotoId: {}", savedPhoto.getPhotoId());
            log.info("  ImgUrl: {}", savedPhoto.getImgUrl());
            log.info("  RoomId: {}", savedPhoto.getRoomId());
            log.info("  UserList: '{}'", savedPhoto.getUserList());
            log.info("  OriginalPhotoId: {}", savedPhoto.getOriginalPhotoId());
            log.info("  CreatedAt: {}", savedPhoto.getCreatedAt());
            log.info("  UpdatedAt: {}", savedPhoto.getUpdatedAt());
            log.info("  DeletedAt: {}", savedPhoto.getDeletedAt());

            // 6️⃣ 저장 검증
            log.info("=== 6️⃣ 저장 검증 ===");
            try {
                Photo verificationPhoto = photoRepository.findById(savedPhoto.getPhotoId())
                    .orElse(null);
                if (verificationPhoto != null) {
                    log.info("✅ DB에서 재조회 성공 - PhotoId: {}", verificationPhoto.getPhotoId());
                    log.info("재조회된 ImgUrl: {}", verificationPhoto.getImgUrl());
                } else {
                    log.error("❌ DB에서 재조회 실패 - PhotoId: {}", savedPhoto.getPhotoId());
                }
            } catch (Exception e) {
                log.error("❌ 저장 검증 중 오류: {}", e.getMessage(), e);
            }

            // 7️⃣ MyPhoto 저장
            log.info("=== 7️⃣ MyPhoto 저장 시도 ===");
            try {
                saveToMyPhotoForAllUsers(finalImageUrl, userList, roomId);
                log.info("✅ MyPhoto 저장 완료");
            } catch (Exception e) {
                log.error("❌ MyPhoto 저장 실패: {}", e.getMessage(), e);
            }

            long endTime = System.currentTimeMillis();
            log.info("=== ✅ 최종 합성 이미지 Photo 저장 완료 ===");
            log.info("JobId: {}, 총 소요시간: {}ms", jobId, (endTime - startTime));
            log.info("저장된 PhotoId: {}, FinalUrl: {}", savedPhoto.getPhotoId(), finalImageUrl);

        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            log.error("=== ❌ 최종 합성 이미지 Photo 저장 실패 ===");
            log.error("JobId: {}, 소요시간: {}ms", jobId, (endTime - startTime));
            log.error("오류 타입: {}", e.getClass().getSimpleName());
            log.error("오류 메시지: {}", e.getMessage());
            log.error("스택 트레이스: ", e);

            // 🔍 트랜잭션 상태 확인
            try {
                boolean isRollbackOnly = org.springframework.transaction.support.TransactionSynchronizationManager.isCurrentTransactionReadOnly();
                log.error("현재 트랜잭션 롤백 전용 여부: {}", isRollbackOnly);
            } catch (Exception txEx) {
                log.error("트랜잭션 상태 확인 실패: {}", txEx.getMessage());
            }

            // 🔍 예외를 다시 던지지 않음 (트랜잭션 롤백 방지)
            log.warn("⚠️ Photo 저장 실패했지만 예외를 억제하여 웹훅 처리 계속 진행");
        }
    }

    // 기존 코드
    @Transactional
    public void saveCompletedPhoto(ImageProcessingCompletedWebhook webhook) {
        try {
            String jobId = webhook.jobId();

            // 1. Redis에서 individual_job 정보 가져오기 (새로운 구조 우선)
            Map<Object, Object> jobInfo = redisTemplate.opsForHash()
                .entries("individual_job:" + jobId);

            Long roomId;
            if (!jobInfo.isEmpty()) {
                // 새로운 개별 처리 방식
                roomId = Long.valueOf((String) jobInfo.get("room_id"));
                log.info("개별 처리된 이미지 저장 - JobId: {}, RoomId: {}", jobId, roomId);
            } else {
                // 기존 방식 호환성 (fallback)
                String roomIdString = redisTemplate.opsForValue().get("job_room:" + jobId);
                try {
                    roomId = Long.valueOf(roomIdString);
                    log.info("기존 방식으로 이미지 저장 - JobId: {}, RoomId: {}", jobId, roomId);
                } catch (NumberFormatException e) {
                    log.error("❌ roomId 변환 실패. roomIdString: {}", roomIdString, e);
                    return;
                }
            }

            if (webhook.data() != null) {
                String processedImageUrl = webhook.data().processedImageUrl();

                // 2. Redis에서 실제 Room 정보 가져오기
                String roomKey = "room:" + roomId;
                Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);

                String userList = null;
                LocalDateTime roomCreatedAt = LocalDateTime.now(); // 기본값: 현재 시간

                if (!roomData.isEmpty()) {
                    // 참가자 정보
                    userList = (String) roomData.get("participants");

                    // 방 생성 시간 가져오기
                    String roomCreatedAtStr = (String) roomData.get("createdAt");
                    if (roomCreatedAtStr != null) {
                        try {
                            roomCreatedAt = LocalDateTime.parse(roomCreatedAtStr);
                            log.debug("방 생성 시간 사용: {}", roomCreatedAt);
                        } catch (Exception e) {
                            log.warn("방 생성 시간 파싱 실패, 현재 시간 사용: {}", e.getMessage());
                            roomCreatedAt = LocalDateTime.now();
                        }
                    }
                }

                // userList가 없으면 personIds라도 저장 (fallback)
                if (userList == null || userList.trim().isEmpty()) {
                    if (webhook.data().personIds() != null) {
                        userList = String.join(",", webhook.data().personIds());
                        log.warn("⚠️ Room 참가자 정보가 없어서 personIds로 대체했습니다. RoomId: {}", roomId);
                    }
                }

                // 3. PHOTO 테이블에 저장 (방 생성 시간 포함)
                Photo photo = createPhotoWithTimestamp(processedImageUrl, roomId, userList,
                    roomCreatedAt);
                Photo savedPhoto = photoRepository.save(photo);

                log.info("✅ PHOTO 저장 성공 - PhotoId: {}, RoomId: {}, UserList: {}, 방생성시간: {}",
                    savedPhoto.getPhotoId(), roomId, userList, roomCreatedAt);

                // 4. 각 사용자별로 MyPhoto 테이블에도 저장
                saveToMyPhotoForAllUsers(processedImageUrl, userList, roomId);
            }

        } catch (Exception e) {
            log.error("❌ Photo 저장 실패: {}", e.getMessage(), e);
        }
    }
    /**
     * 새로 추가 - 최종 합성된 이미지 저장
     */
//  @Transactional
//  public void saveFinalComposedPhoto(FrameCompositionCompletedWebhook webhook) {
//    try {
//      String jobId = webhook.jobId();
//
//      // 1. Redis에서 frame job 정보 가져오기
//      Map<Object, Object> jobInfo = redisTemplate.opsForHash().entries("frame_job:" + jobId);
//
//      if (jobInfo.isEmpty()) {
//        log.error("❌ Frame Job 정보를 찾을 수 없습니다 - JobId: {}", jobId);
//        return;
//      }
//
//      Long roomId = Long.valueOf((String) jobInfo.get("room_id"));
//
//      if (webhook.data() != null) {
//        String finalImageUrl = webhook.data().finalImageUrl();
//
//        // 2. Redis에서 Room 정보 가져오기
//        String roomKey = "room:" + roomId;
//        Map<Object, Object> roomData = redisTemplate.opsForHash().entries(roomKey);
//
//        String userList = null;
//        LocalDateTime roomCreatedAt = LocalDateTime.now(); // 기본값: 현재 시간
//
//        if (!roomData.isEmpty()) {
//          // 참가자 정보
//          userList = (String) roomData.get("participants");
//
//          // 방 생성 시간 가져오기
//          String roomCreatedAtStr = (String) roomData.get("createdAt");
//          if (roomCreatedAtStr != null) {
//            try {
//              roomCreatedAt = LocalDateTime.parse(roomCreatedAtStr);
//              log.debug("방 생성 시간 사용: {}", roomCreatedAt);
//            } catch (Exception e) {
//              log.warn("방 생성 시간 파싱 실패, 현재 시간 사용: {}", e.getMessage());
//              roomCreatedAt = LocalDateTime.now();
//            }
//          }
//        }
//
//        // userList가 없으면 빈 문자열로 설정
//        if (userList == null) {
//          userList = "";
//          log.warn("⚠️ Room 참가자 정보가 없습니다. RoomId: {}", roomId);
//        }
//
//        // 3. 최종 합성된 이미지를 PHOTO 테이블에 저장 (방 생성 시간 포함)
//        Photo photo = createPhotoWithTimestamp(finalImageUrl, roomId, userList, roomCreatedAt);
//        Photo savedPhoto = photoRepository.save(photo);
//
//        log.info("✅ 최종 합성 이미지 저장 성공 - PhotoId: {}, RoomId: {}, FinalUrl: {}, 방생성시간: {}",
//            savedPhoto.getPhotoId(), roomId, finalImageUrl, roomCreatedAt);
//
//        // 4. 각 사용자별로 MyPhoto 테이블에도 저장
//        saveToMyPhotoForAllUsers(finalImageUrl, userList, roomId);
//      }
//
//    } catch (Exception e) {
//      log.error("❌ 최종 합성 이미지 저장 실패: {}", e.getMessage(), e);
//    }
//  }

    /**
     * 방 생성 시간을 포함한 Photo 객체 생성
     */
    private Photo createPhotoWithTimestamp(String imageUrl, Long roomId, String userList,
        LocalDateTime roomCreatedAt) {
        // 기본 생성자 사용
        Photo photo = new Photo(imageUrl, roomId, userList, null);

        // 리플렉션을 사용하여 방 생성 시간으로 설정
        try {
            setFieldValue(photo, "createdAt", roomCreatedAt);
            setFieldValue(photo, "updatedAt", roomCreatedAt);

            log.debug("Photo 시간 정보 설정 완료 - 방 생성 시간: {}", roomCreatedAt);
        } catch (Exception e) {
            log.warn("Photo 시간 정보 설정 실패, JPA Auditing에 의존: {}", e.getMessage());
        }

        return photo;
    }

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
     * Photo 저장 후 각 사용자별로 MyPhoto 테이블에도 저장
     */
    private void saveToMyPhotoForAllUsers(String imageUrl, String userList, Long roomId) {
        if (userList == null || userList.trim().isEmpty()) {
            log.warn("⚠️ userList가 비어있어서 MyPhoto 저장을 건너뜁니다.");
            return;
        }

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
                        PhotoInsertDto photoDto = new PhotoInsertDto(imageUrl, userList, roomId,
                            null);
                        myPhotoMapper.savePhotoToMyPhoto(photoDto);

                        // Archive 테이블에 저장
                        myPhotoMapper.saveToArchive(userId, photoDto.getPhotoId());
                        log.debug("✅ Photo 및 Archive 저장 성공 - userId: {}, email: {}, imageUrl: {}",
                            userId, trimmedEmail, imageUrl);
                    } else {
                        log.warn("⚠️ 사용자를 찾을 수 없습니다 - email: {}", trimmedEmail);
                    }

                } catch (Exception e) {
                    log.error("❌ 개별 사용자 MyPhoto 저장 실패 - email: {}, error: {}", trimmedEmail,
                        e.getMessage());
                }
            }

            log.info("✅ 모든 사용자 MyPhoto 저장 완료 - userCount: {}, imageUrl: {}", userEmails.size(),
                imageUrl);

        } catch (Exception e) {
            log.error("❌ MyPhoto 저장 중 전체 오류 - imageUrl: {}, userList: {}, error: {}", imageUrl,
                userList, e.getMessage());
        }
    }
}