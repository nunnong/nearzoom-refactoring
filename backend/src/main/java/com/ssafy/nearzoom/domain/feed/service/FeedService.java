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
     * 🆔 계정명으로 피드 조회 (프로필 + 피드 통합)
     */
    @Transactional(readOnly = true)
    public FeedDetailResponse getFeedByAccountName(Authentication authentication, String accountName) {

        // 1. 계정명으로 사용자 찾기
        User targetUser = userRepository.findByAccountName(accountName)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        // 2. 해당 사용자의 피드 찾기 (1명당 1개)
        Feed feed = feedRepository.findByUser_UserId(targetUser.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "피드를 찾을 수 없습니다."));

        // 3. 현재 로그인 사용자 정보
        User loginUser = getLoginUser(authentication);

        // 4. 좋아요 상태 확인
        boolean liked = likesRepository.existsByFeed_FeedIdAndUser_UserId(
                feed.getFeedId(), loginUser.getUserId()
        );

        // 5. 기존 toCard 메서드 재사용
        return toCard(feed, loginUser.getUserId());
    }

    /**
     * 🔍 피드 검색 (= 사용자 검색, 계정 통합 적용)
     */
    @Transactional(readOnly = true)
    public List<FeedDetailResponse> searchFeeds(Authentication authentication, String query, int size) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }

        String searchQuery = query.trim().toLowerCase();
        PageRequest pageRequest = PageRequest.ofSize(size * 2); // 중복 제거를 위해 더 많이 조회

        // 1. 사용자 검색 (계정명, 이메일, 사용자명)
        List<User> users = userRepository.searchByAccountNameOrEmailOrUserName(
                searchQuery, searchQuery, searchQuery, pageRequest
        );

        // 2. 계정 통합 처리 (같은 이메일 사용자명 중복 제거)
        Map<String, User> uniqueUsers = new LinkedHashMap<>();
        for (User user : users) {
            String emailUsername = extractEmailUsername(user.getUserEmail());

            if (uniqueUsers.containsKey(emailUsername)) {
                User existingUser = uniqueUsers.get(emailUsername);
                // Gmail 우선순위로 교체
                if (hasHigherEmailPriority(user.getUserEmail(), existingUser.getUserEmail())) {
                    uniqueUsers.put(emailUsername, user);
                }
            } else {
                uniqueUsers.put(emailUsername, user);
            }
        }

        // 3. 현재 로그인 사용자
        User loginUser = getLoginUser(authentication);

        // 4. 각 사용자의 피드 조회 (피드가 있는 사용자만)
        return uniqueUsers.values().stream()
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

    private String extractEmailUsername(String email) {
        return email.split("@")[0];
    }

    private boolean hasHigherEmailPriority(String email1, String email2) {
        return getEmailPriority(email1) < getEmailPriority(email2);
    }

    private int getEmailPriority(String email) {
        if (email.endsWith("@gmail.com")) return 1;
        if (email.endsWith("@naver.com")) return 2;
        if (email.endsWith("@daum.net")) return 3;
        return 9;
    }
}
