package com.ssafy.nearzoom;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan(basePackages = "com.ssafy.nearzoom.domain.myroom.repository",
            annotationClass = org.apache.ibatis.annotations.Mapper.class)

public class NearzoomApplication {

    public static void main(String[] args) {
        SpringApplication.run(NearzoomApplication.class, args);
    }

}
