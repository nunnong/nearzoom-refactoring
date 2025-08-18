package com.ssafy.nearzoom.domain.feed.dto;

import java.util.List;

public record PostListResponse(
    List<PostResponse> posts,
    boolean hasNext,
    Long nextCursor
) {
    
    public static PostListResponse of(List<PostResponse> posts) {
        return new PostListResponse(posts, false, null);
    }

    public static PostListResponse of(List<PostResponse> posts, boolean hasNext, Long nextCursor) {
        return new PostListResponse(posts, hasNext, nextCursor);
    }
}