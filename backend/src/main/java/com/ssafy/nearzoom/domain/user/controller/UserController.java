package com.ssafy.nearzoom.domain.user.controller;

import com.ssafy.nearzoom.domain.user.dto.UserInfoResponse;
import com.ssafy.nearzoom.domain.user.service.UserService;
import com.ssafy.nearzoom.global.response.ApiResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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
}
