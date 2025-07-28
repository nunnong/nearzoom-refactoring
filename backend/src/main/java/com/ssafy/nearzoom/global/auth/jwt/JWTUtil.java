package com.ssafy.nearzoom.global.auth.jwt;

import com.ssafy.nearzoom.domain.user.entity.Social;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.Jwts.SIG;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * JWT 토큰 생성/파싱/만료 검증 등 JWT 관련 유틸리티
 */
@Component
public class JWTUtil {

    private final SecretKey secretKey;
    private final long accessTokenExpiration;
    private final long refreshTokenExpiration;

    public JWTUtil(
        @Value("${spring.jwt.secret}") String secret,
        @Value("${spring.jwt.access-expiration}") long accessTokenExpiration,
        @Value("${spring.jwt.refresh-expiration}") long refreshTokenExpiration
    ) {
        secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),
            SIG.HS256.key().build().getAlgorithm());
        this.accessTokenExpiration = accessTokenExpiration;
        this.refreshTokenExpiration = refreshTokenExpiration;
    }

    public String createAccessToken(String name, String email, Social social) {
        return Jwts.builder()
            .claim("name", name)
            .claim("email", email)
            .claim("social", social)
            .claim("category", "access")
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
            .signWith(secretKey)
            .compact();
    }

    public String createRefreshToken(String email) {
        return Jwts.builder()
            .claim("email", email)
            .claim("category", "refresh")
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiration))
            .signWith(secretKey)
            .compact();
    }

    public String getName(String token) {
        return Jwts.parser().setSigningKey(secretKey).build().parseClaimsJws(token).getBody()
            .get("name", String.class);
    }

    public String getEmail(String token) {
        return Jwts.parser().setSigningKey(secretKey).build().parseClaimsJws(token).getBody()
            .get("email", String.class);
    }

    public String getRole(String token) {
        return Jwts.parser().setSigningKey(secretKey).build().parseClaimsJws(token).getBody()
            .get("role", String.class);
    }

    public Social getSocial(String token) {
        return Jwts.parser().setSigningKey(secretKey).build().parseClaimsJws(token).getBody()
            .get("social", Social.class);
    }

    // 수정
    public String getCategory(String token) {
        return Jwts.parser().setSigningKey(secretKey).build().parseSignedClaims(token).getBody()
            .get("category", String.class);
    }

    public Boolean isExpired(String token) {
        return Jwts.parser().setSigningKey(secretKey).build().parseClaimsJws(token).getBody()
            .getExpiration().before(new Date());
    }

    public long getExpiry(String token) {
        return Jwts.parser()
            .setSigningKey(secretKey)
            .build()
            .parseClaimsJws(token)
            .getBody()
            .getExpiration()
            .getTime();
    }
}
