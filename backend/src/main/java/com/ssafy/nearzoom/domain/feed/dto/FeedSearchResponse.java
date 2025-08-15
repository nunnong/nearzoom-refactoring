package com.ssafy.nearzoom.domain.feed.dto;

import java.util.List;

/**
 * 피드 검색 결과 응답 - 마이룸 방식
 */
public record FeedSearchResponse(
    List<FeedWithPostsResponse> feeds,  // 검색된 피드들
    boolean hasNext,                    // 다음 페이지 존재 여부
    Long nextCursor                     // 다음 커서
) {

    public static FeedSearchResponse empty() {
        return new FeedSearchResponse(List.of(), false, null);
    }

    public static FeedSearchResponse of(List<FeedWithPostsResponse> feeds, boolean hasNext, Long nextCursor) {
        return new FeedSearchResponse(feeds, hasNext, nextCursor);
    }
}