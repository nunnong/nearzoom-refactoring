package com.ssafy.nearzoom.domain.feed.service;

import com.ssafy.nearzoom.domain.feed.dto.*;
import com.ssafy.nearzoom.domain.feed.entity.Feed;
import com.ssafy.nearzoom.domain.feed.entity.Post;
import com.ssafy.nearzoom.domain.feed.repository.FeedRepository;
import com.ssafy.nearzoom.domain.feed.repository.FollowRepository;
import com.ssafy.nearzoom.domain.feed.repository.LikesRepository;
import com.ssafy.nearzoom.domain.feed.repository.PostRepository;
import com.ssafy.nearzoom.domain.photo.entity.Photo;
import com.ssafy.nearzoom.domain.photo.repository.PhotoRepository;
import com.ssafy.nearzoom.domain.user.dto.UserAuthInfoResponse;
import com.ssafy.nearzoom.domain.user.entity.User;
import com.ssafy.nearzoom.domain.user.repository.UserRepository;
import com.ssafy.nearzoom.global.auth.util.AuthUtil;
import com.ssafy.nearzoom.global.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FeedService {

    private final FeedRepository feedRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final PhotoRepository photoRepository;
    private final FollowRepository followRepository;
    private final LikesRepository likesRepository; // 🔥 중복 제거

    private User getLoginUser(Authentication authentication) {
        UserAuthInfoResponse loginUserInfo = AuthUtil.getUserAuthInfo(authentication);
        return userRepository.getByEmailAndSocial(loginUserInfo.email(), loginUserInfo.social());
    }

    /**
     * 🆕 마이룸 사진으로 피드에 게시물 추가
     */
    @Transactional
    public Long createPostFromMyRoom(Authentication authentication, CreatePostFromMyRoomRequest req) {
        User loginUser = getLoginUser(authentication);

        // 사진 존재 확인 및 소유권 검증
        Photo photo = photoRepository.findById(req.photoId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사진이 존재하지 않습니다."));

        // 이미 해당 사진으로 게시물이 있는지 확인
        if (postRepository.existsByFeed_User_UserIdAndPhoto_PhotoId(loginUser.getUserId(), req.photoId())) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 피드에 올린 사진입니다.");
        }

        // 사용자의 피드 조회 또는 생성
        Feed userFeed = feedRepository.findByUser_UserId(loginUser.getUserId())
            .orElseGet(() -> {
                // ⚡️ 수정: title, description 제거
                Feed newFeed = Feed.of(loginUser);
                return feedRepository.save(newFeed);
            });

        // 다음 표시 순서 계산
        Integer nextOrder = postRepository.getNextDisplayOrder(userFeed.getFeedId());

        // 게시물 생성
        Post post = Post.of(userFeed, photo, req.caption(), nextOrder);
        Post savedPost = postRepository.save(post);

        return savedPost.getPostId();
    }

    /**
     * 사용자의 피드 조회 (게시물 포함)
     */
    @Transactional(readOnly = true)
    public FeedWithPostsResponse getUserFeedWithPosts(Authentication authentication, Long userId) {
        User loginUser = getLoginUser(authentication);

        Feed feed = feedRepository.findByUser_UserId(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "피드가 존재하지 않습니다."));

        List<Post> posts = postRepository.findByFeedIdOrderByDisplayOrder(feed.getFeedId());

        boolean isFollowing = followRepository.existsByFollower_UserIdAndFollowee_UserId(
            loginUser.getUserId(), userId);

        // 🔥 수정: viewerId 전달
        List<PostResponse> postResponses = posts.stream()
            .map(p -> toPostResponse(p, loginUser.getUserId()))
            .toList();

        return new FeedWithPostsResponse(
            feed.getFeedId(),
            feed.getUser().getUserId(),
            feed.getUser().getAccountName(),
            feed.getUser().getProfileImage(),
            feed.getCreatedAt(),
            postResponses,
            isFollowing
        );
    }

    /**
     * 게시물 상세 조회
     */
    @Transactional(readOnly = true)
    public PostResponse getPost(Long postId) {
        Post post = postRepository.findPostWithDetails(postId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "게시물이 존재하지 않습니다."));

        return toPostResponse(post);
    }

    /**
     * 게시물 수정
     */
    @Transactional
    public void updatePost(Authentication authentication, Long postId, UpdatePostRequest req) {
        User loginUser = getLoginUser(authentication);

        Post post = postRepository.findPostWithDetails(postId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "게시물이 존재하지 않습니다."));

        // 권한 확인
        if (!post.getFeed().getUser().getUserId().equals(loginUser.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "본인의 게시물만 수정할 수 있습니다.");
        }

        post.updateCaption(req.caption());
    }

    /**
     * 게시물 삭제
     */
    @Transactional
    public void deletePost(Authentication authentication, Long postId) {
        User loginUser = getLoginUser(authentication);

        Post post = postRepository.findPostWithDetails(postId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "게시물이 존재하지 않습니다."));

        // 권한 확인
        if (!post.getFeed().getUser().getUserId().equals(loginUser.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "본인의 게시물만 삭제할 수 있습니다.");
        }

        postRepository.delete(post);
    }

    /**
     * 팔로잉하는 사용자들의 최신 게시물들 조회
     */
    @Transactional(readOnly = true)
    public List<PostResponse> getFollowingLatestPosts(Authentication authentication, int size) {
        User loginUser = getLoginUser(authentication);

        // 팔로잉하는 사용자들의 피드에서 최신 게시물들 조회
        PageRequest pageRequest = PageRequest.ofSize(size);
        List<Post> posts = postRepository.findFollowingLatestPosts(loginUser.getUserId(), pageRequest);

        // 🔥 수정: viewerId 전달
        return posts.stream()
            .map(p -> toPostResponse(p, loginUser.getUserId()))
            .toList();
    }

    /**
     * 랜덤 게시물들 조회
     */
    @Transactional(readOnly = true)
    public List<PostResponse> getRandomPosts(Authentication authentication, int size) {
        User loginUser = getLoginUser(authentication);
        List<Post> posts = postRepository.findRandomPosts(size);

        // 🔥 수정: viewerId 전달
        return posts.stream()
            .map(p -> toPostResponse(p, loginUser.getUserId()))
            .toList();
    }

    /**
     * 피드 검색 (사용자 검색)
     */
    @Transactional(readOnly = true)
    public List<FeedWithPostsResponse> searchFeeds(Authentication authentication, String query, int size) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }

        User loginUser = getLoginUser(authentication);
        String searchQuery = query.trim();
        PageRequest pageRequest = PageRequest.ofSize(size);

        List<User> users = userRepository.searchByAccountNameOnly(searchQuery, pageRequest);

        return users.stream()
            .map(user -> {
                Feed feed = feedRepository.findByUser_UserId(user.getUserId()).orElse(null);
                if (feed != null) {
                    List<Post> posts = postRepository.findByFeedIdOrderByDisplayOrder(feed.getFeedId());
                    boolean isFollowing = followRepository.existsByFollower_UserIdAndFollowee_UserId(
                        loginUser.getUserId(), user.getUserId());

                    // 🔥 수정: viewerId 전달
                    List<PostResponse> postResponses = posts.stream()
                        .map(p -> toPostResponse(p, loginUser.getUserId()))
                        .toList();

                    return new FeedWithPostsResponse(
                        feed.getFeedId(),
                        user.getUserId(),
                        user.getAccountName(),
                        user.getProfileImage(),
                        feed.getCreatedAt(),
                        postResponses,
                        isFollowing
                    );
                }
                return null;
            })
            .filter(feedResponse -> feedResponse != null)
            .limit(size)
            .toList();
    }

    /**
     * 📊 좋아요 정보를 포함한 PostResponse 생성
     */
    private PostResponse toPostResponse(Post post, Long viewerId) {
        long likeCount = likesRepository.countByPost_PostId(post.getPostId());
        boolean isLikedByMe = (viewerId != null) &&
            likesRepository.existsByPost_PostIdAndUser_UserId(post.getPostId(), viewerId);

        return new PostResponse(
            post.getPostId(),
            post.getPhoto().getPhotoId(),
            post.getPhoto().getImgUrl(),
            post.getCaption(),
            post.getDisplayOrder(),
            post.getCreatedAt(),
            likeCount,
            isLikedByMe,
            post.getFeed().getUser().getUserId(),
            post.getFeed().getUser().getAccountName(),
            post.getFeed().getUser().getProfileImage()
        );
    }

    /**
     * 📊 좋아요 정보 없는 버전 (로그인하지 않은 사용자용)
     */
    private PostResponse toPostResponse(Post post) {
        return toPostResponse(post, null);
    }

    /**
     * 👤 계정명으로 사용자 피드 조회 (계정 클릭 시 사용)
     */
    @Transactional(readOnly = true)
    public FeedWithPostsResponse getUserFeedByAccountName(Authentication authentication, String accountName) {
        User loginUser = getLoginUser(authentication);

        // 계정명으로 사용자 찾기
        User targetUser = userRepository.findByAccountName(accountName)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        return getUserFeedWithPosts(authentication, targetUser.getUserId());
    }

    /**
     * 📄 게시물 상세 조회 (단일 게시물 클릭 시)
     */
    @Transactional(readOnly = true)
    public PostDetailResponse getPostDetail(Authentication authentication, Long postId) {
        User loginUser = getLoginUser(authentication);

        Post post = postRepository.findPostWithDetails(postId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "게시물이 존재하지 않습니다."));

        // 좋아요 정보
        long likeCount = likesRepository.countByPost_PostId(postId);
        boolean isLikedByMe = likesRepository.existsByPost_PostIdAndUser_UserId(postId, loginUser.getUserId());

        // 관계 정보
        boolean isMyPost = post.getFeed().getUser().getUserId().equals(loginUser.getUserId());
        boolean isFollowingAuthor = followRepository.existsByFollower_UserIdAndFollowee_UserId(
            loginUser.getUserId(), post.getFeed().getUser().getUserId());

        return new PostDetailResponse(
            post.getPostId(),
            post.getPhoto().getPhotoId(),
            post.getPhoto().getImgUrl(),
            post.getCaption(),
            post.getCreatedAt(),
            likeCount,
            isLikedByMe,
            post.getFeed().getUser().getUserId(),
            post.getFeed().getUser().getAccountName(),
            post.getFeed().getUser().getProfileImage(),
            post.getFeed().getFeedId(),
            isMyPost,
            isFollowingAuthor
        );
    }

    /**
     * 📊 내 피드 통계 조회 (본인용)
     */
    @Transactional(readOnly = true)
    public MyFeedStatsResponse getMyFeedStats(Authentication authentication) {
        User loginUser = getLoginUser(authentication);

        Feed myFeed = feedRepository.findByUser_UserId(loginUser.getUserId())
            .orElse(null);

        if (myFeed == null) {
            return new MyFeedStatsResponse(0L, 0L, 0L, 0L);
        }

        long postCount = postRepository.countByFeed_FeedId(myFeed.getFeedId());
        long totalLikes = postRepository.findByFeedIdOrderByDisplayOrder(myFeed.getFeedId())
            .stream()
            .mapToLong(post -> likesRepository.countByPost_PostId(post.getPostId()))
            .sum();
        long followerCount = followRepository.countByFollowee_UserId(loginUser.getUserId());
        long followingCount = followRepository.countByFollower_UserId(loginUser.getUserId());

        return new MyFeedStatsResponse(postCount, totalLikes, followerCount, followingCount);
    }
}