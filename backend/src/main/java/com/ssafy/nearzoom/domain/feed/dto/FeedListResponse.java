package com.ssafy.nearzoom.domain.feed.dto;

import java.util.List;

public record FeedListResponse(
    List<FeedItem> items,
    Long nextCursor,
    boolean hasNext
) {

}
