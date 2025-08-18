package com.ssafy.nearzoom.domain.user.controller;

import com.ssafy.nearzoom.domain.user.dto.CheckAccountNameResponse;
import com.ssafy.nearzoom.domain.user.dto.UpdateProfileRequest;
import com.ssafy.nearzoom.domain.user.dto.UserInfoResponse;
import com.ssafy.nearzoom.domain.user.dto.UserProfileResponse;
import com.ssafy.nearzoom.domain.user.service.UserService;
import com.ssafy.nearzoom.global.exception.ApiException;
import com.ssafy.nearzoom.global.response.ApiResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("user")
public class UserController {

    private final UserService userService;

    @GetMapping("/profile1")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getProfile1(
        Authentication authentication) {
        UserProfileResponse profile = userService.getCurrentUserProfile(authentication);
        return ApiResponse.ok(profile);
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile(
        Authentication authentication) {
        UserProfileResponse profile = userService.getCurrentUserProfile(authentication);
        return ApiResponse.ok(profile);
    }

    @GetMapping("/profile/{accountName}")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getUserProfileByAccountName(
        @PathVariable String accountName,
        Authentication authentication) {
        UserProfileResponse profile = userService.getUserProfileByAccountName(accountName);
        return ApiResponse.ok(profile);
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request,
        HttpServletResponse response, Authentication authentication) {

        userService.logout(authentication);

        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        Cookie jsession = new Cookie("JSESSIONID", "");
        jsession.setPath("/");
        jsession.setMaxAge(0);
        response.addCookie(jsession);

        Cookie deleteCookie = new Cookie("RefreshToken", null);
        deleteCookie.setHttpOnly(true);
        deleteCookie.setSecure(false);
        deleteCookie.setPath("/");
        deleteCookie.setMaxAge(0);

        response.addCookie(deleteCookie);

        return ApiResponse.ok("로그아웃 성공", null);
    }

    @GetMapping("/userInfo")
    public ResponseEntity<ApiResponse<UserInfoResponse>> getUserInfo(
        Authentication authentication) {
        UserInfoResponse info = userService.getUserInfo(authentication);
        return ApiResponse.ok(info);
    }

    @GetMapping("/prettyFace")
    public ResponseEntity<ApiResponse<String>> getPrettyFace(
        Authentication authentication) {
        String prettyFace = userService.getPrettyFace(authentication);
        return ApiResponse.ok(prettyFace);
    }

    @DeleteMapping("/signout")
    public ResponseEntity<ApiResponse<Void>> withdraw(HttpServletRequest request,
        HttpServletResponse response, Authentication authentication) {

        userService.signout(authentication);

        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        Cookie jsession = new Cookie("JSESSIONID", "");
        jsession.setPath("/");
        jsession.setMaxAge(0);
        response.addCookie(jsession);

        Cookie deleteCookie = new Cookie("RefreshToken", null);
        deleteCookie.setHttpOnly(true);
        deleteCookie.setSecure(false);
        deleteCookie.setPath("/");
        deleteCookie.setMaxAge(0);

        response.addCookie(deleteCookie);

        return ApiResponse.ok("회원탈퇴 완료!", null);
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getCurrentUserProfile(
        Authentication authentication) {
        UserProfileResponse profile = userService.getCurrentUserProfile(authentication);
        return ApiResponse.ok(profile);
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<Void>> updateProfile(
        Authentication authentication,
        @Valid @RequestBody UpdateProfileRequest request) {
        userService.updateProfile(authentication, request);
        return ApiResponse.ok("프로필이 성공적으로 업데이트되었습니다.", null);
    }

    @GetMapping("/check-account-name")
    public ResponseEntity<ApiResponse<CheckAccountNameResponse>> checkAccountNameAvailable(
        @RequestParam String accountName,
        Authentication authentication) {
        CheckAccountNameResponse response = userService.checkAccountNameAvailable(accountName,
            authentication);
        return ApiResponse.ok(response);
    }

    @PutMapping("/save-face-image")
    public ResponseEntity<ApiResponse<String>> updatePrettyFace(
        Authentication authentication,
        @RequestParam("prettyFaceUrl") String prettyFaceUrl) {

        System.out.println("=== UserController.updatePrettyFace 호출 ===");
        System.out.println("Received prettyFaceUrl parameter: " + prettyFaceUrl);

        try {
            if (prettyFaceUrl == null || prettyFaceUrl.trim().isEmpty()) {
                System.out.println("ERROR: URL이 비어있음");
                return ApiResponse.failedOf(HttpStatus.BAD_REQUEST,
                    "이미지 URL이 비어있습니다.");
            }

            if (!prettyFaceUrl.startsWith("http://") && !prettyFaceUrl.startsWith("https://")) {
                System.out.println("ERROR: 잘못된 URL 형식: " + prettyFaceUrl);
                return ApiResponse.failedOf(HttpStatus.BAD_REQUEST,
                    "유효하지 않은 URL 형식입니다.");
            }

            if (authentication == null || !authentication.isAuthenticated()) {
                System.out.println("ERROR: 인증되지 않은 사용자");
                return ApiResponse.failedOf(HttpStatus.UNAUTHORIZED,
                    "인증되지 않은 사용자입니다.");
            }

            System.out.println("UserService.updatePrettyFace 호출 시작");
            userService.updatePrettyFace(authentication, prettyFaceUrl);
            System.out.println("UserService.updatePrettyFace 호출 완료");

            return ApiResponse.ok("예쁜 얼굴 이미지가 성공적으로 저장되었습니다.");
        } catch (ApiException e) {
            System.err.println("ApiException 발생: " + e.getMessage());
            return ApiResponse.failedOf(e);
        } catch (Exception e) {
            System.err.println("일반 Exception 발생: " + e.getMessage());
            e.printStackTrace();
            return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
                "이미지 URL 저장 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
}