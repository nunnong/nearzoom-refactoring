package com.ssafy.nearzoom.domain.photo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageUploadService {

    private final RestClient restClient; // ✅ RestClient로 통일

    @Value("${IMAGE_SERVER_URL:https://image.nearzoom.store}")
    private String imageServerUrl;

    /**
     * 편집된 이미지를 이미지 서버에 업로드
     */
    public String uploadEditedImage(MultipartFile file, Long originalPhotoId, String userEmail) {
        log.info(">>> [ImageUploadService] 편집 이미지 업로드 시작 - originalPhotoId: {}, 사용자: {}",
                originalPhotoId, userEmail);

        try {
            // 1) 파일명
            String fileName = generateEditedFileName(file.getOriginalFilename(), originalPhotoId, userEmail);

            // 2) 멀티파트 바디
            MultiValueMap<String, Object> parts = createMultipartRequest(file, fileName);

            // 3) 헤더
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            // 4) 업로드 요청
            String uploadUrl = imageServerUrl + "/media/uploads/";
            log.debug(">>> 이미지 서버 업로드 요청 - URL: {}, 파일명: {}", uploadUrl, fileName);

            ResponseEntity<ImageUploadResponse> response = restClient.post()
                    .uri(uploadUrl)
                    .headers(h -> h.addAll(headers))
                    .body(parts)
                    .retrieve()
                    .toEntity(ImageUploadResponse.class);

            // 5) 응답 처리
            if (response.getStatusCode() == HttpStatus.OK) {
                String uploadedImageUrl = imageServerUrl + "/media/uploads/" + fileName;
                log.info("✅ 편집 이미지 업로드 성공 - URL: {}", uploadedImageUrl);
                return uploadedImageUrl;
            }
            throw new RuntimeException("이미지 서버 응답 오류: " + response.getStatusCode());

        } catch (IOException e) {
            log.error("❌ 파일 읽기 오류 - originalPhotoId: {}, 사용자: {}", originalPhotoId, userEmail, e);
            throw new RuntimeException("업로드할 파일을 읽는데 실패했습니다.", e);
        } catch (RestClientException e) {
            log.error("❌ 이미지 서버 통신 오류 - originalPhotoId: {}, 사용자: {}", originalPhotoId, userEmail, e);
            throw new RuntimeException("이미지 서버와의 통신에 실패했습니다.", e);
        } catch (Exception e) {
            log.error("❌ 편집 이미지 업로드 중 예상치 못한 오류 - originalPhotoId: {}, 사용자: {}", originalPhotoId, userEmail, e);
            throw new RuntimeException("편집 이미지 업로드 중 오류가 발생했습니다.", e);
        }
    }

    // 편집 파일명 생성
    private String generateEditedFileName(String originalFileName, Long originalPhotoId, String userEmail) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String extension = (originalFileName != null && originalFileName.contains("."))
                ? originalFileName.substring(originalFileName.lastIndexOf("."))
                : ".jpg";
        String userName = (userEmail != null && userEmail.contains("@"))
                ? userEmail.substring(0, userEmail.indexOf("@"))
                : "user";

        String fileName = String.format("edited_%s_%d_%s%s", timestamp, originalPhotoId, userName, extension);
        log.debug(">>> 생성된 편집 파일명: {}", fileName);
        return fileName;
    }

    // 멀티파트 구성
    private MultiValueMap<String, Object> createMultipartRequest(MultipartFile file, String fileName) throws IOException {
        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();

        ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return fileName;
            }
        };

        parts.add("file", fileResource);
        parts.add("fileName", fileName);
        return parts;
    }

    // 응답 DTO
    public static class ImageUploadResponse {
        private String message;
        private String fileName;
        private String filePath;

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }
        public String getFilePath() { return filePath; }
        public void setFilePath(String filePath) { this.filePath = filePath; }
    }
}
