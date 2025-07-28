package com.ssafy.nearzoom.global.s3.controller;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.ListObjectsV2Result;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/s3-test")
public class S3TestController {

  private final AmazonS3 amazonS3Client;

  @Value("${cloud.aws.s3.bucket}")
  private String bucket;

  @Value("${cloud.aws.region.static}")
  private String region;

  @GetMapping("/list")
  public List<String> listFiles() {
    ListObjectsV2Result result = amazonS3Client.listObjectsV2(bucket);
    return result.getObjectSummaries().stream()
        .map(obj -> "https://" + bucket + ".s3." + region + ".amazonaws.com/" + obj.getKey())
        .toList();
  }
}

