package com.ssafy.nearzoom.domain.feed.dto;

import java.util.List;

public record FeedSearchResponse(
    List<FeedWithPostsResponse> feeds,
    boolean hasNext,
    Long nextCursor
) {

    public static FeedSearchResponse empty() {
        return new FeedSearchResponse(List.of(), false, null);
    }

    public static FeedSearchResponse of(List<FeedWithPostsResponse> feeds, boolean hasNext,
        Long nextCursor) {
        return new FeedSearchResponse(feeds, hasNext, nextCursor);
    }
}