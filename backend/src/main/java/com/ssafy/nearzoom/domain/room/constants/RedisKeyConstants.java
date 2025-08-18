package com.ssafy.nearzoom.domain.room.constants;

public final class RedisKeyConstants {

    private RedisKeyConstants() {
    }

    public static final String ROOM_KEY_PREFIX = "room:";
    public static final String PARTICIPANT_KEY_PREFIX = "participant:";
    public static final long REDIS_TTL_HOURS = 1;
    public static final int TOKEN_TTL_MINUTES = 5;
}