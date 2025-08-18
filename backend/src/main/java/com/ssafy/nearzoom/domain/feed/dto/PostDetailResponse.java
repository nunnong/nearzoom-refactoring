package com.ssafy.nearzoom.domain.feed.dto;

import java.time.LocalDateTime;

public record PostDetailResponse(

    Long postId,
    Long photoId,
    String imgUrl,
    String caption,
    LocalDateTime createdAt,

    long likeCount,
    boolean isLikedByMe,


    Long authorId,
    String authorAccountName,
    String authorProfileImage,
    Long authorFeedId,


    boolean isMyPost,
    boolean isFollowingAuthor
) {

}