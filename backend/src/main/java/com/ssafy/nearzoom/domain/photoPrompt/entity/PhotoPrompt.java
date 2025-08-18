package com.ssafy.nearzoom.domain.photoPrompt.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

import com.ssafy.nearzoom.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "PHOTO_PROMPT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PhotoPrompt extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "prompt_id")
  private Long promptId;

  @Column(name = "prompt_text", columnDefinition = "TEXT", nullable = false)
  private String promptText;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", length = 7, nullable = false)
  private PromptStatus status = PromptStatus.PENDING;



  // 생성자 (prompt 타입용)
  public PhotoPrompt(String promptText) {
    this.promptText = promptText;
    this.status = PromptStatus.PENDING;
  }

  // 상태 업데이트
  public void updateStatus(PromptStatus status) {
    this.status = status;
  }
}