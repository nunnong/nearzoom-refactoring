package com.ssafy.nearzoom.domain.feed.service;

import com.ssafy.nearzoom.domain.feed.dto.CreateFeedRequest;
import com.ssafy.nearzoom.domain.feed.dto.FeedDetailResponse;
import com.ssafy.nearzoom.domain.feed.entity.Feed;
import com.ssafy.nearzoom.domain.feed.repository.FeedRepository;
import com.ssafy.nearzoom.domain.feed.repository.FollowRepository;
import com.ssafy.nearzoom.domain.feed.repository.LikesRepository;
import com.ssafy.nearzoom.domain.photo.entity.Photo;
import com.ssafy.nearzoom.domain.photo.repository.PhotoRepository;
import com.ssafy.nearzoom.domain.user.dto.UserAuthInfoResponse;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import com.ssafy.nearzoom.global.exception.ApiException;
import java.time.LocalDateTime;
import java.util.*;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FeedService {

    private final FeedRepository feedRepository;
    private final LikesRepository likesRepository;
    private final UserRepository userRepository;
    private final PhotoRepository photoRepository;
    private final FollowRepository followRepository;

    private User getLoginUser(Authentication authentication) {
        UserAuthInfoResponse loginUserInfo = AuthUtil.getUserAuthInfo(authentication);
        return userRepository.getByEmailAndSocial(loginUserInfo.email(), loginUserInfo.social());
    }

    @Transactional
    public Long create(Authentication authentication, CreateFeedRequest req) {
        User loginUser = getLoginUser(authentication);

        Photo photo = photoRepository.findById(req.photoId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사진이 없습니다."));

        try {
            Feed saved = feedRepository.save(Feed.of(loginUser, photo, req.caption()));
            return saved.getFeedId();
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(HttpStatus.FORBIDDEN, "내 사진만 게시할 수 있습니다.");
        }
    }

    @Transactional(readOnly = true)
    public FeedDetailResponse detailFeeds(Authentication authentication, Long feedId) {
        Feed feed = feedRepository.findDetail(feedId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "게시물이 없습니다."));

        User loginUser = getLoginUser(authentication);
        Long viewerId = loginUser.getUserId();

        boolean liked = (viewerId != null) &&
            likesRepository.existsByFeed_FeedIdAndUser_UserId(feedId, viewerId);

        return new FeedDetailResponse(
            feed.getFeedId(),
            feed.getPhoto().getImgUrl(),
            feed.getCaption(),
            feed.getUser().getUserId(),
            feed.getUser().getAccountName(),
            feed.getUser().getProfileImage(),
            feed.getCreatedAt(),
            liked
        );
    }

    @Transactional(readOnly = true)
    public List<FeedDetailResponse> userFeed(Authentication authentication,
        Long userId,
        LocalDateTime cursorAt,
        Long cursorId,
        int size) {

        User loginUser = getLoginUser(authentication);
        Long viewerId = loginUser.getUserId();

        var page = PageRequest.ofSize(size);
        return feedRepository.findUserFeedPage(userId, cursorAt, cursorId, page).stream()
            .map(feed -> toCard(feed, viewerId))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<FeedDetailResponse> followingFeed(Authentication authentication,
        LocalDateTime cursorAt,
        Long cursorId,
        int size) {

        Long meId = getLoginUser(authentication).getUserId();
        var page = PageRequest.ofSize(size);

        return feedRepository.findFollowingPage(meId, cursorAt, cursorId, page).stream()
            .map(feed -> toCard(feed, meId))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<FeedDetailResponse> randomFeed(Authentication authentication, int size) {

        User loginUser = getLoginUser(authentication);
        Long viewerId = loginUser.getUserId();

        return feedRepository.findRandom(size).stream()
            .map(feed -> toCard(feed, viewerId))
            .toList();
    }

    private FeedDetailResponse toCard(Feed feed, Long viewerIdOrNull) {
        boolean liked = (viewerIdOrNull != null) &&
            likesRepository.existsByFeed_FeedIdAndUser_UserId(feed.getFeedId(), viewerIdOrNull);
        return new FeedDetailResponse(
            feed.getFeedId(),
            feed.getPhoto().getImgUrl(),
            feed.getCaption(),
            feed.getUser().getUserId(),
            feed.getUser().getAccountName(),
            feed.getUser().getProfileImage(),
            feed.getCreatedAt(),
            liked
        );
    }

    /**
     * 🔍 피드 검색 (= 사용자 검색) - accountName만 검색하도록 단순화
     */
    @Transactional(readOnly = true)
    public List<FeedDetailResponse> searchFeeds(Authentication authentication, String query, int size) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }

        String searchQuery = query.trim();
        PageRequest pageRequest = PageRequest.ofSize(size);

        // 1. accountName으로만 검색
        List<User> users = userRepository.searchByAccountNameOnly(searchQuery, pageRequest);

        // 2. 현재 로그인 사용자
        User loginUser = getLoginUser(authentication);

        // 3. 🔥 계정 통합 로직 완전 제거 - 바로 피드 조회
        return users.stream()
                .map(user -> {
                    // 해당 사용자의 피드 찾기
                    Optional<Feed> feedOpt = feedRepository.findByUser_UserId(user.getUserId());
                    if (feedOpt.isPresent()) {
                        return toCard(feedOpt.get(), loginUser.getUserId());
                    }
                    return null;
                })
                .filter(Objects::nonNull)
                .limit(size)
                .toList();
    }
}
