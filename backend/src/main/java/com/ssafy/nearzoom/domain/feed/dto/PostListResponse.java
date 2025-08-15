package com.ssafy.nearzoom.domain.feed.dto;

import java.util.List;

/**
 * 게시물 목록 응답 - 마이룸의 MyPhotoListResponse와 동일한 구조
 */
public record PostListResponse(
        List<PostResponse> posts,    // MyPhotoListResponse의 photos와 대응
        boolean hasNext,             // 동일
        Long nextCursor              // 동일 (마지막 postId)
) {
    /**
     * 빈 응답 생성
     */
    public static PostListResponse empty() {
        return new PostListResponse(List.of(), false, null);
    }

    /**
     * 단일 페이지 응답 생성
     */
    public static PostListResponse of(List<PostResponse> posts) {
        return new PostListResponse(posts, false, null);
    }

    /**
     * 페이징 응답 생성
     */
    public static PostListResponse of(List<PostResponse> posts, boolean hasNext, Long nextCursor) {
        return new PostListResponse(posts, hasNext, nextCursor);
    }
}