// UpdateProfileRequest.java
package com.ssafy.nearzoom.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @NotBlank(message = "계정명은 필수입니다.")
    @Size(min = 3, max = 30, message = "계정명은 3-30자 사이여야 합니다.")
    @Pattern(regexp = "^[a-zA-Z0-9._]+$", message = "계정명은 영문, 숫자, '.', '_'만 사용 가능합니다.")
    String accountName
) {
}