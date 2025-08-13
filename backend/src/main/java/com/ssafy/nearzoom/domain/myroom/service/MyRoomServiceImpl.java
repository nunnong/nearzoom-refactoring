package com.ssafy.nearzoom.domain.myroom.service;

import com.ssafy.nearzoom.domain.myroom.dto.HeartUpdateRequest;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListCondition;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListResponse;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoResponse;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoDeleteRequest;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoEditSaveRequest;
import com.ssafy.nearzoom.domain.myroom.repository.MyPhotoMapper;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.domain.user.dto.UserAuthInfoResponse;
import com.ssafy.nearzoom.domain.photo.service.ImageUploadService;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MyRoomServiceImpl implements MyRoomService {

    private final MyPhotoMapper photoRepository;
    private final UserRepository userRepository;
    private final AuthUtil authUtil;
    private final ImageUploadService imageUploadService;

    @Override
    public MyPhotoListResponse getMyPhotos(Authentication authentication, MyPhotoListCondition cond) {
        UserAuthInfoResponse userInfo = authUtil.getUserAuthInfo(authentication);
        System.out.println(">>> [DEBUG] 👤 UserInfo - Email: " + userInfo.email() + ", Social: " + userInfo.social());

        Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social()).getUserId();
        System.out.println(">>> [DEBUG] 🔍 Found userId: " + userId);

        System.out.println(">>> [DEBUG] 📋 Condition - limit: " + cond.limit() +
            ", cursor: " + cond.cursor() +
            ", heart: " + cond.heart() +
            ", partnerEmails: " + cond.partnerEmails() +
            ", startDate: " + cond.startDate() +
            ", endDate: " + cond.endDate());

        List<MyPhotoResponse> photos = photoRepository.findPhotosByCondition(userId, cond);
        System.out.println(">>> [DEBUG] 📸 MyBatis 쿼리 결과: " + photos.size() + "개");

        if (photos.isEmpty()) {
            System.out.println(">>> [DEBUG] ❌ 사진이 없습니다!");
        } else {
            System.out.println(">>> [DEBUG] ✅ 첫 번째 사진: photoId=" + photos.get(0).photoId() +
                ", imageUrl=" + photos.get(0).imageUrl());
        }

        boolean hasNext = photos.size() == cond.limit();
        Long nextCursor = hasNext ? photos.get(photos.size() - 1).photoId() : null;

        System.out.println(">>> [DEBUG] 📊 최종 응답: photos=" + photos.size() +
            ", hasNext=" + hasNext +
            ", nextCursor=" + nextCursor);

        return new MyPhotoListResponse(photos, hasNext, nextCursor);
    }

    @Override
    public void updateHeart(Authentication authentication, HeartUpdateRequest request) {
        UserAuthInfoResponse userInfo = authUtil.getUserAuthInfo(authentication);
        Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social()).getUserId();

        photoRepository.updateHeart(userId, request.photoId(), request.heart());
    }

    @Override
    public void deletePhoto(Authentication authentication, PhotoDeleteRequest request) {
        UserAuthInfoResponse userInfo = authUtil.getUserAuthInfo(authentication);
        Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social()).getUserId();

        photoRepository.softDeletePhoto(userId, request.photoId());
    }

    @Override
    public void saveEditedPhoto(Authentication authentication, PhotoEditSaveRequest request) {
        UserAuthInfoResponse userInfo = authUtil.getUserAuthInfo(authentication);
        Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social()).getUserId();

        photoRepository.markAsEdited(userId, request.photoId());
    }

    @Override
    public String uploadEditedImage(MultipartFile file, Long originalPhotoId, Authentication authentication, String description) {
        log.info(">>> [MyRoomServiceImpl] 편집된 이미지 업로드 처리 시작 - originalPhotoId: {}", originalPhotoId);

        try {
            // 1. 사용자 정보 조회
            UserAuthInfoResponse userInfo = authUtil.getUserAuthInfo(authentication);
            Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social()).getUserId();
            String userEmail = userInfo.email();
            
            // 2. 편집 권한 확인 (원본 사진이 편집 가능한지 확인)
            boolean canEdit = photoRepository.checkEditPermission(userId, originalPhotoId);
            if (!canEdit) {
                throw new RuntimeException("해당 사진은 편집할 수 없습니다.");
            }
            
            // 3. 이미지 서버에 업로드
            String uploadedImageUrl = imageUploadService.uploadEditedImage(file, originalPhotoId, userEmail);
            log.debug(">>> 이미지 업로드 완료 - URL: {}", uploadedImageUrl);
            
            // 4. my_photo 테이블에 편집본 저장 (편집 불가 상태로)
            photoRepository.savePhotoToMyPhoto(userId, uploadedImageUrl, null);
            log.debug(">>> my_photo 테이블에 편집본 저장 완료");
            
            // 5. 원본 사진을 편집 불가 상태로 변경
            photoRepository.markAsEdited(userId, originalPhotoId);
            log.debug(">>> 원본 사진을 편집 불가 상태로 변경 완료");
            
            log.info("편집된 이미지 처리 완료 - originalPhotoId: {}, uploadedUrl: {}", originalPhotoId, uploadedImageUrl);
            return uploadedImageUrl;
            
        } catch (Exception e) {
            log.error("편집된 이미지 업로드 처리 실패 - originalPhotoId: {}", originalPhotoId, e);
            throw new RuntimeException("편집된 이미지 처리 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }
}
