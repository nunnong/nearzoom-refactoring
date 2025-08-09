package com.ssafy.nearzoom.domain.feed.service;

import com.ssafy.nearzoom.domain.feed.dto.FeedDetailResponse;
import com.ssafy.nearzoom.domain.feed.entity.Feed;
import com.ssafy.nearzoom.domain.feed.repository.FeedRepository;
import com.ssafy.nearzoom.domain.photo.entity.Photo;
import com.ssafy.nearzoom.domain.photo.repository.PhotoRepository;
import com.ssafy.nearzoom.domain.user.dto.UserAuthInfoResponse;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import com.ssafy.nearzoom.global.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FeedService {

    private final FeedRepository feedRepository;
    private final UserRepository userRepository;
    private final PhotoRepository photoRepository;
    private final AuthUtil authUtil;

    @Transactional
    public FeedDetailResponse create(Authentication authentication, Long photoId) {
        UserAuthInfoResponse loginUserInfo = authUtil.getUserAuthInfo(authentication);

        User loginUser = userRepository.getByEmailAndSocial(loginUserInfo.email(),
            loginUserInfo.social());
        if (loginUser == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "로그인 정보를 확인할 수 없습니다.");
        }

        Photo photo = photoRepository.findById(photoId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사진이 존재하지 않습니다."));

        Feed saved = feedRepository.save(Feed.of(loginUser.getUserId(), photo));

        return new FeedDetailResponse(
            saved.getFeedId(),
            loginUser.getUserId(),
            photo.getPhotoId(),
            photo.getImgUrl(),
            saved.getCreatedAt(),
            saved.getUpdatedAt()
        );
    }

    @Transactional(readOnly = true)
    public FeedDetailResponse getDetail(Long feedId) {
        Feed feed = feedRepository.findById(feedId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "피드가 존재하지 않습니다."));

        return new FeedDetailResponse(
            feed.getFeedId(),
            feed.getUserId(),
            feed.getPhoto().getPhotoId(),
            feed.getPhoto().getImgUrl(),
            feed.getCreatedAt(),
            feed.getUpdatedAt()
        );
    }

    @Transactional
    public void delete(Authentication authentication, Long feedId) {
        UserAuthInfoResponse loginUserInfo = AuthUtil.getUserAuthInfo(authentication);

        User loginUser = userRepository.getByEmailAndSocial(loginUserInfo.email(),
            loginUserInfo.social());
        if (loginUser == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "로그인 정보를 확인할 수 없습니다.");
        }

        Feed feed = feedRepository.findById(feedId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "피드를 찾을 수 없습니다."));

        if (!feed.getUserId().equals(loginUser.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "내 피드만 삭제할 수 있습니다.");
        }

        feedRepository.delete(feed);
    }
}
