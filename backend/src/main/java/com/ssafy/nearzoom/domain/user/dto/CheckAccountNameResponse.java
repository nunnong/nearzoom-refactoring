package com.ssafy.nearzoom.domain.user.dto;

public final class CheckAccountNameResponse {

    private final boolean available;
    private final String message;

    private CheckAccountNameResponse(boolean available, String message) {
        this.available = available;
        this.message = message;
    }

    public boolean isAvailable() {
        return available;
    }

    public String getMessage() {
        return message;
    }

    public static CheckAccountNameResponse available() {
        return new CheckAccountNameResponse(true, "사용 가능한 계정명입니다.");
    }

    public static CheckAccountNameResponse unavailable(String reason) {
        return new CheckAccountNameResponse(false, reason);
    }
}

