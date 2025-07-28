package com.ssafy.nearzoom.global.s3.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.CannedAccessControlList;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.PutObjectRequest;
import com.ssafy.nearzoom.global.s3.exception.EmptyFileException;
import com.ssafy.nearzoom.global.s3.exception.InvalidImageExtensionException;
import com.ssafy.nearzoom.global.exception.ApiException;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartRequest;

@Service
public class AwsS3Service {

  private final AmazonS3 amazonS3Client;

  @Value("${cloud.aws.s3.bucket}")
  private String bucket;

  private final List<String> allowedExt = List.of(".jpg", ".jpeg", ".png", ".gif");

  @Autowired
  public AwsS3Service(AmazonS3 amazonS3Client) {
    this.amazonS3Client = amazonS3Client;
  }

  public String imageUpload(MultipartRequest request) throws IOException {
    MultipartFile file = request.getFile("upload");

    if (file == null || file.isEmpty()) {
      throw new EmptyFileException();
    }

    String originalFileName = file.getOriginalFilename();

    if (originalFileName == null || !originalFileName.contains(".")) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "파일 이름이 유효하지 않습니다.");
    }

    String ext = originalFileName.substring(originalFileName.lastIndexOf(".")).toLowerCase();
    if (!allowedExt.contains(ext)) {
      throw new InvalidImageExtensionException();
    }

    String uuidFileName = UUID.randomUUID() + ext;

    ObjectMetadata metadata = new ObjectMetadata();
    metadata.setContentLength(file.getSize());
    metadata.setContentType(file.getContentType());

    amazonS3Client.putObject(
        new PutObjectRequest(bucket, uuidFileName, file.getInputStream(), metadata)
            .withCannedAcl(CannedAccessControlList.PublicRead)
    );

    return amazonS3Client.getUrl(bucket, uuidFileName).toString();
  }
}


