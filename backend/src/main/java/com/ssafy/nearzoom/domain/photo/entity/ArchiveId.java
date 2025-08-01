package com.ssafy.nearzoom.domain.photo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ArchiveId implements Serializable {

  @Column(name = "user_id")
  private Long userId;

  @Column(name = "photo_id")
  private Long photoId;
}