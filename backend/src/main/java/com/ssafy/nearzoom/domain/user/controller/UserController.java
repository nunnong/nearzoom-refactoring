package com.ssafy.nearzoom.domain.user.controller;

import com.ssafy.nearzoom.domain.user.dto.UserInfoResponse;
import com.ssafy.nearzoom.domain.user.service.UserService;
import com.ssafy.nearzoom.global.exception.ApiException;
import com.ssafy.nearzoom.global.response.ApiResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("user")
public class UserController {

    private final UserService userService;

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request,
        HttpServletResponse response, Authentication authentication) {

        userService.logOut(authentication);

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

    @GetMapping("/email-user-info")
    public ResponseEntity<ApiResponse<List<UserInfoResponse>>> getFeedUserInfo(
        String email) {
        List<UserInfoResponse> info = userService.getFeedUserInfo(email);

        if (info.isEmpty()) {
            return ApiResponse.ok("해당 이메일의 사용자가 없습니다.", null);
        }
        return ApiResponse.ok("사용자가 존재합니다.", info);
    }

    @DeleteMapping("/sign-out")
    public ResponseEntity<ApiResponse<Void>> withdraw(HttpServletRequest request,
        HttpServletResponse response, Authentication authentication) {

        userService.signOut(authentication);

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

    @PutMapping("/save-face-image")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updatePrettyFace(
        Authentication authentication,
        @RequestBody String prettyFaceUrl) {
        try {
            userService.updatePrettyFace(authentication, prettyFaceUrl);

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("prettyFaceUrl", prettyFaceUrl);
            responseData.put("updatedAt", LocalDateTime.now().toString());

            return ApiResponse.ok("예쁜 얼굴 이미지가 성공적으로 저장되었습니다.", responseData);
        } catch (ApiException e) {
            return ApiResponse.failedOf(e);
        } catch (Exception e) {
            return ApiResponse.failedOf(HttpStatus.INTERNAL_SERVER_ERROR,
                "이미지 URL 저장 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
}
