package com.ssafy.nearzoom.domain.photo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.ssafy.nearzoom.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "PHOTO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Photo extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "photo_id")
  private Long photoId;

  @Column(name = "img_url", columnDefinition = "TEXT", nullable = false)
  private String imgUrl;

  @Column(name = "user_list", columnDefinition = "TEXT")
  private String userList;

  @Column(name = "roomId", length = 100, nullable = false)
  private Long roomId;

  // 생성자
  public Photo(String imgUrl, Long roomId, String userList) {
    this.imgUrl = imgUrl;
    this.roomId = roomId;
    this.userList = userList;
  }
}
