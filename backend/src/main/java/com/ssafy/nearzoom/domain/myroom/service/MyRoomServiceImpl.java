package com.ssafy.nearzoom.domain.myroom.service;

import com.ssafy.nearzoom.domain.feed.repository.PostRepository;
import com.ssafy.nearzoom.domain.myroom.dto.HeartUpdateRequest;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListCondition;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoListResponse;
import com.ssafy.nearzoom.domain.myroom.dto.MyPhotoResponse;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoDeleteRequest;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoEditSaveRequest;
import com.ssafy.nearzoom.domain.myroom.dto.PhotoForFeedUploadResponse;
import com.ssafy.nearzoom.domain.myroom.repository.MyPhotoMapper;
import com.ssafy.nearzoom.domain.photo.entity.Photo;
import com.ssafy.nearzoom.domain.photo.repository.PhotoRepository;
import com.ssafy.nearzoom.domain.photo.service.PhotoService;
import com.ssafy.nearzoom.domain.user.dto.UserAuthInfoResponse;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import com.ssafy.nearzoom.global.exception.ApiException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public MyPhotoListResponse getMyPhotos(Authentication authentication,
        MyPhotoListCondition cond) {
        UserAuthInfoResponse userInfo = AuthUtil.getUserAuthInfo(authentication);
        Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social())
            .getUserId();

        List<MyPhotoResponse> photos = myPhotoMapper.findPhotosByCondition(userId, cond);

        boolean hasNext = photos.size() == cond.limit();
        Long nextCursor = hasNext ? photos.get(photos.size() - 1).photoId() : null;

        return new MyPhotoListResponse(photos, hasNext, nextCursor);
    }

    @Override
    public void updateHeart(Authentication authentication, HeartUpdateRequest request) {
        UserAuthInfoResponse userInfo = AuthUtil.getUserAuthInfo(authentication);
        Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social())
            .getUserId();

        myPhotoMapper.updateHeart(userId, request.photoId(), request.heart());
    }

    @Override
    public void deletePhoto(Authentication authentication, PhotoDeleteRequest request) {
        UserAuthInfoResponse userInfo = AuthUtil.getUserAuthInfo(authentication);
        Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social())
            .getUserId();

        myPhotoMapper.softDeletePhoto(userId, request.photoId());
    }

    @Override
    @Transactional
    public String saveEditedImageUrl(PhotoEditSaveRequest request, Authentication authentication) {
        try {
            UserAuthInfoResponse userInfo = AuthUtil.getUserAuthInfo(authentication);
            Long userId = userRepository.getByEmailAndSocial(userInfo.email(), userInfo.social())
                .getUserId();

            boolean canEdit = myPhotoMapper.checkEditPermission(userId, request.originalPhotoId());
            if (!canEdit) {
                throw new ApiException(HttpStatus.FORBIDDEN, "해당 사진은 편집할 수 없습니다.");
            }

            Photo savedPhoto = photoService.saveEditedPhoto(request.imgUrl(),
                request.originalPhotoId());

            Photo originalPhoto = photoService.getOriginalPhotoInfo(request.originalPhotoId());
            myPhotoMapper.saveToArchive(userId, savedPhoto.getPhotoId(),
                originalPhoto.getCreatedAt());

            myPhotoMapper.markAsEdited(userId, request.originalPhotoId());

            return request.imgUrl();

        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                "편집된 이미지 처리 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PhotoForFeedUploadResponse getPhotoForFeedUpload(Long photoId,
        Authentication authentication) {
        User loginUser = getLoginUser(authentication);

        Photo photo = photoRepository.findById(photoId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사진이 존재하지 않습니다."));

        boolean alreadyInFeed = postRepository.existsByFeed_User_UserIdAndPhoto_PhotoId(
            loginUser.getUserId(), photoId);

        return new PhotoForFeedUploadResponse(
            photo.getPhotoId(),
            photo.getImgUrl(),
            photo.getCreatedAt(),
            alreadyInFeed
        );
    }
}