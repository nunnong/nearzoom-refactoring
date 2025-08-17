package com.ssafy.nearzoom.domain.user.entity;

import com.ssafy.nearzoom.global.auth.oauth2.dto.OAuth2Response;
import com.ssafy.nearzoom.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    @Column(length = 20, nullable = false)
    @Comment("이름")
    private String userName;

    @Column(length = 255, nullable = false)
    @Comment("이메일")
    private String userEmail;

    @Column(length = 255, nullable = false)
    @Comment("계정명")
    private String accountName;

    @Column(columnDefinition = "TEXT")
    @Comment("프로필 사진")
    private String profileImage;

    @Enumerated(EnumType.STRING)
    @Comment("소셜 로그인 제공자")
    private Social socialType;

    @Column(columnDefinition = "TEXT")
    @Comment("예쁜 얼굴 이미지 URL")
    private String prettyFace;

    private User(String userName, String userEmail, String accountName, String profileImage,
        Social socialType) {
        this.userName = userName;
        this.userEmail = userEmail;
        this.accountName = accountName;
        this.profileImage = profileImage;
        this.socialType = socialType;
    }

    public static User of(String userName, String userEmail, String accountName,
        String profileImage,
        Social socialType) {
        return new User(userName, userEmail, accountName, profileImage, socialType);
    }

    public void update(OAuth2Response oAuth2Response) {
        this.userName = oAuth2Response.getName();
        this.profileImage = oAuth2Response.getProfileImage();
    }

    public void updatePrettyFace(String prettyFaceUrl) {
        this.prettyFace = prettyFaceUrl;
    }

    // =========================================
    // 📝 프로필 업데이트 관련 메서드들 (신규 추가)
    // =========================================

    /**
     * 계정명 업데이트
     */
    public void updateAccountName(String newAccountName) {
        this.accountName = newAccountName;
    }

    /**
     * 소셜 로그인 시 계정명 초기 설정 (이메일 기반)
     * 회원 가입 시에 사용
     */
    public void initializeAccountName() {
        if (this.accountName == null || this.accountName.isEmpty()) {
            // 전체 이메일을 기본 계정명으로 설정
            this.accountName = this.userEmail;
        }
    }
}