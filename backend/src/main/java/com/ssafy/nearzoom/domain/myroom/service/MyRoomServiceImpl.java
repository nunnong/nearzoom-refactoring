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
import com.ssafy.nearzoom.domain.feed.repository.PostRepository;
import com.ssafy.nearzoom.domain.myroom.dto.*;
import com.ssafy.nearzoom.domain.photo.entity.Photo;
import com.ssafy.nearzoom.domain.photo.repository.PhotoRepository;
import com.ssafy.nearzoom.domain.photo.service.PhotoService;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import com.ssafy.nearzoom.global.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MyRoomServiceImpl implements MyRoomService {

    private final MyPhotoMapper myPhotoMapper;
    private final UserRepository userRepository;
    private final PhotoRepository photoRepository;
    private final PostRepository postRepository;
    private final PhotoService photoService;

    private User getLoginUser(Authentication authentication) {
        UserAuthInfoResponse loginUserInfo = AuthUtil.getUserAuthInfo(authentication);
        return userRepository.getByEmailAndSocial(loginUserInfo.email(), loginUserInfo.social());
    }

    @Override
    public MyPhotoListResponse getMyPhotos(Authentication authentication, MyPhotoListCondition cond) {
        UserAuthInfoResponse userInfo = AuthUtil.getUserAuthInfo(authentication);
        Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social()).getUserId();

        List<MyPhotoResponse> photos = myPhotoMapper.findPhotosByCondition(userId, cond);

        boolean hasNext = photos.size() == cond.limit();
        Long nextCursor = hasNext ? photos.get(photos.size() - 1).photoId() : null;

        return new MyPhotoListResponse(photos, hasNext, nextCursor);
    }

    @Override
    public void updateHeart(Authentication authentication, HeartUpdateRequest request) {
        UserAuthInfoResponse userInfo = AuthUtil.getUserAuthInfo(authentication);
        Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social()).getUserId();

        myPhotoMapper.updateHeart(userId, request.photoId(), request.heart());
    }

    @Override
    public void deletePhoto(Authentication authentication, PhotoDeleteRequest request) {
        UserAuthInfoResponse userInfo = AuthUtil.getUserAuthInfo(authentication);
        Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social()).getUserId();

        myPhotoMapper.softDeletePhoto(userId, request.photoId());
    }

    @Override
    public void saveEditedPhoto(Authentication authentication, PhotoEditSaveRequest request) {
        UserAuthInfoResponse userInfo = AuthUtil.getUserAuthInfo(authentication);
        Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social()).getUserId();

        myPhotoMapper.markAsEdited(userId, request.originalPhotoId());
    }

    @Override
    @Transactional
    public String saveEditedImageUrl(PhotoEditSaveRequest request, Authentication authentication) {
        try {
            // 1. 사용자 정보 조회
            UserAuthInfoResponse userInfo = AuthUtil.getUserAuthInfo(authentication);
            Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social()).getUserId();

            // 2. 편집 권한 확인 (원본 사진이 편집 가능한지 확인)
            boolean canEdit = myPhotoMapper.checkEditPermission(userId, request.originalPhotoId());
            if (!canEdit) {
                throw new ApiException(HttpStatus.FORBIDDEN, "해당 사진은 편집할 수 없습니다.");
            }

            // 3. Photo 테이블에 편집본 저장 (원본 정보 포함)
            Photo savedPhoto = photoService.saveEditedPhoto(request.imgUrl(), request.originalPhotoId());

            // 4. Archive 테이블에 편집본 저장 (편집 불가 상태로)
            // 편집본은 편집한 사용자만 Archive에 저장
            // 원본 사진의 생성 시간을 전달하여 created_at 설정
            Photo originalPhoto = photoService.getOriginalPhotoInfo(request.originalPhotoId());
            myPhotoMapper.saveToArchive(userId, savedPhoto.getPhotoId(), originalPhoto.getCreatedAt());

            // 5. 원본 사진을 편집 불가 상태로 변경
            myPhotoMapper.markAsEdited(userId, request.originalPhotoId());
            
            return request.imgUrl();

        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "편집된 이미지 처리 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    /**
     * 🆕 마이룸 사진을 피드 게시물로 업로드하기 위한 정보 조회
     */
    @Override
    @Transactional(readOnly = true)
    public PhotoForFeedUploadResponse getPhotoForFeedUpload(Long photoId, Authentication authentication) {
        User loginUser = getLoginUser(authentication);

        // 사진 존재 확인 및 소유권 검증
        Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사진이 존재하지 않습니다."));

        // 이미 피드에 올렸는지 확인
        boolean alreadyInFeed = postRepository.existsByFeed_User_UserIdAndPhoto_PhotoId(
                loginUser.getUserId(), photoId);

        // 🔥 DTO와 일치하도록 4개 필드만 반환
        return new PhotoForFeedUploadResponse(
                photo.getPhotoId(),
                photo.getImgUrl(),      // ✅ 존재하는 필드
                photo.getCreatedAt(),   // ✅ BaseEntity에서 상속받은 필드
                alreadyInFeed
        );
    }
}