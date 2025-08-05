# base image
FROM jenkins/jenkins:jdk21

# root 권한으로 전환
USER root

# 필수 패키지 설치 및 docker 설치
RUN apt-get update && apt-get install -y \
    lsb-release \
    curl \
    unzip \
    wget \
    gnupg2 \
 && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
 && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list \
 && apt-get update \
 && apt-get install -y docker-ce docker-ce-cli docker-compose-plugin containerd.io

# Gradle 설치
ENV GRADLE_VERSION=8.14.3
RUN wget https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip -P /tmp \
 && unzip /tmp/gradle-${GRADLE_VERSION}-bin.zip -d /opt/gradle \
 && echo "export GRADLE_HOME=/opt/gradle/gradle-${GRADLE_VERSION}" >> /etc/profile.d/gradle.sh \
 && echo "export PATH=\$PATH:\$GRADLE_HOME/bin" >> /etc/profile.d/gradle.sh \
 && chmod +x /etc/profile.d/gradle.sh \
 && ln -s /opt/gradle/gradle-${GRADLE_VERSION}/bin/gradle /usr/bin/gradle

# Jenkins 사용자를 docker 그룹에 추가
RUN usermod -aG docker jenkins

# 다시 jenkins 사용자로 복귀
USER jenkins