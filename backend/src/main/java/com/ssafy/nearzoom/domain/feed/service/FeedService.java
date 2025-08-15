// FeedService.java - 마이룸 방식에 맞춘 서비스

package com.ssafy.nearzoom.domain.feed.service;

import com.ssafy.nearzoom.domain.feed.dto.*;
import com.ssafy.nearzoom.domain.feed.entity.Feed;
import com.ssafy.nearzoom.domain.feed.dto.PostResponse;
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
    private final LikesRepository likesRepository;

    private User getLoginUser(Authentication authentication) {
        UserAuthInfoResponse loginUserInfo = AuthUtil.getUserAuthInfo(authentication);
        return userRepository.getByEmailAndSocial(loginUserInfo.email(), loginUserInfo.social());
    }

    /**
     * PostListResponse 생성 - 마이룸의 MyPhotoListResponse와 동일한 로직
     */
    private PostListResponse buildPostListResponse(List<Post> posts, int limit, Long viewerId) {
        // 📱 마이룸 방식: posts.size() > limit으로 hasNext 판단
        boolean hasNext = posts.size() > limit;

        // 실제 반환할 게시물들 (limit 개수만큼)
        List<Post> actualPosts = hasNext ? posts.subList(0, limit) : posts;

        // PostResponse로 변환
        List<PostResponse> postResponses = actualPosts.stream()
                .map(p -> toPostResponse(p, viewerId))
                .toList();

        // 다음 커서 계산 (마지막 postId)
        Long nextCursor = hasNext && !actualPosts.isEmpty() ?
                actualPosts.get(actualPosts.size() - 1).getPostId() : null;

        return PostListResponse.of(postResponses, hasNext, nextCursor);
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

    // =========================================
    // 📱 마이룸 방식: limit + cursor 파라미터
    // =========================================

    // FeedService.java - Repository에 Pageable 전달하도록 수정

    @Transactional(readOnly = true)
    public PostListResponse getRandomPosts(Authentication authentication, int limit, Long cursor) {
        User loginUser = getLoginUser(authentication);

        // ✅ PageRequest 생성하고 Repository에 전달
        PageRequest pageRequest = PageRequest.ofSize(limit + 1);
        List<Post> posts = postRepository.findRandomPosts(cursor, pageRequest); // Pageable 전달

        return buildPostListResponse(posts, limit, loginUser.getUserId());
    }

    @Transactional(readOnly = true)
    public PostListResponse getFollowingLatestPosts(Authentication authentication, int limit,
                                                    Long cursor) {
        User loginUser = getLoginUser(authentication);

        // ✅ PageRequest 생성하고 Repository에 전달
        PageRequest pageRequest = PageRequest.ofSize(limit + 1);
        List<Post> posts = postRepository.findFollowingLatestPosts(loginUser.getUserId(), cursor,
                pageRequest);

        return buildPostListResponse(posts, limit, loginUser.getUserId());
    }

    @Transactional(readOnly = true)
    public FeedWithPostsResponse getUserFeedWithPosts(Authentication authentication, Long userId,
                                                      int limit, Long cursor) {
        User loginUser = getLoginUser(authentication);

        Feed feed = feedRepository.findByUser_UserId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "피드가 존재하지 않습니다."));

        // ✅ PageRequest 생성하고 Repository에 전달
        PageRequest pageRequest = PageRequest.ofSize(limit + 1);
        List<Post> posts = postRepository.findByFeedIdWithCursor(feed.getFeedId(), cursor,
                pageRequest);

        boolean hasNext = posts.size() > limit;
        List<Post> actualPosts = hasNext ? posts.subList(0, limit) : posts;
        Long nextCursor = hasNext && !actualPosts.isEmpty() ?
                actualPosts.get(actualPosts.size() - 1).getPostId() : null;

        boolean isFollowing = followRepository.existsByFollower_UserIdAndFollowee_UserId(
                loginUser.getUserId(), userId);

        List<PostResponse> postResponses = actualPosts.stream()
                .map(p -> toPostResponse(p, loginUser.getUserId()))
                .toList();

        return FeedWithPostsResponse.withPaging(
                feed.getFeedId(),
                feed.getUser().getUserId(),
                feed.getUser().getAccountName(),
                feed.getUser().getProfileImage(),
                feed.getCreatedAt(),
                postResponses,
                isFollowing,
                hasNext,
                nextCursor
        );
    }

    @Transactional(readOnly = true)
    public FeedSearchResponse searchFeeds(Authentication authentication, String query, int limit,
                                          Long cursor) {
        if (query == null || query.trim().length() < 2) {
            return FeedSearchResponse.empty();
        }

        User loginUser = getLoginUser(authentication);
        String searchQuery = query.trim();

        // ✅ PageRequest 생성하고 Repository에 전달
        PageRequest pageRequest = PageRequest.ofSize(limit + 1);
        List<User> users = userRepository.searchByAccountNameOnly(searchQuery, cursor, pageRequest);

        boolean hasNext = users.size() > limit;
        List<User> actualUsers = hasNext ? users.subList(0, limit) : users;
        Long nextCursor = hasNext && !actualUsers.isEmpty() ?
                actualUsers.get(actualUsers.size() - 1).getUserId() : null;

        List<FeedWithPostsResponse> feedResponses = actualUsers.stream()
                .map(user -> {
                    Feed feed = feedRepository.findByUser_UserId(user.getUserId()).orElse(null);
                    if (feed != null) {
                        // 미리보기용 게시물 조회 시에도 Pageable 사용
                        PageRequest previewPageRequest = PageRequest.ofSize(6);
                        List<Post> posts = postRepository.findByFeedIdWithCursor(feed.getFeedId(), null,
                                previewPageRequest);

                        boolean isFollowing = followRepository.existsByFollower_UserIdAndFollowee_UserId(
                                loginUser.getUserId(), user.getUserId());

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
                                isFollowing,
                                false,
                                null
                        );
                    }
                    return null;
                })
                .filter(feedResponse -> feedResponse != null)
                .toList();

        return FeedSearchResponse.of(feedResponses, hasNext, nextCursor);
    }

    /**
     * 👤 계정명으로 사용자 피드 조회 (게시물 포함) - 마이룸 방식
     */
    @Transactional(readOnly = true)
    public FeedWithPostsResponse getUserFeedByAccountName(Authentication authentication,
                                                          String accountName, int limit, Long cursor) {
        User targetUser = userRepository.findByAccountName(accountName)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        return getUserFeedWithPosts(authentication, targetUser.getUserId(), limit, cursor);
    }

    /**
     * 📝 마이룸 사진으로 피드에 게시물 추가
     */
    @Transactional
    public Long createPostFromMyRoom(Authentication authentication,
                                     CreatePostFromMyRoomRequest req) {
        User loginUser = getLoginUser(authentication);

        Photo photo = photoRepository.findById(req.photoId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사진이 존재하지 않습니다."));

        if (postRepository.existsByFeed_User_UserIdAndPhoto_PhotoId(loginUser.getUserId(),
                req.photoId())) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 피드에 올린 사진입니다.");
        }

        Feed userFeed = feedRepository.findByUser_UserId(loginUser.getUserId())
                .orElseGet(() -> {
                    Feed newFeed = Feed.of(loginUser);
                    return feedRepository.save(newFeed);
                });

        Integer nextOrder = postRepository.getNextDisplayOrder(userFeed.getFeedId());
        Post post = Post.of(userFeed, photo, req.caption(), nextOrder);
        Post savedPost = postRepository.save(post);

        return savedPost.getPostId();
    }

    /**
     * 게시물 상세 조회
     */
    @Transactional(readOnly = true)
    public PostDetailResponse getPostDetail(Authentication authentication, Long postId) {
        User loginUser = getLoginUser(authentication);

        Post post = postRepository.findPostWithDetails(postId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "게시물이 존재하지 않습니다."));

        // 좋아요 정보
        long likeCount = likesRepository.countByPost_PostId(postId);
        boolean isLikedByMe = likesRepository.existsByPost_PostIdAndUser_UserId(postId,
                loginUser.getUserId());

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
     * 게시물 수정
     */
    @Transactional
    public void updatePost(Authentication authentication, Long postId, UpdatePostRequest req) {
        User loginUser = getLoginUser(authentication);
        Post post = postRepository.findPostWithDetails(postId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "게시물이 존재하지 않습니다."));

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

        if (!post.getFeed().getUser().getUserId().equals(loginUser.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "본인의 게시물만 삭제할 수 있습니다.");
        }
        postRepository.delete(post);
    }
}