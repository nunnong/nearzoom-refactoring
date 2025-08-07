FROM openjdk:21-jdk-slim

COPY app.jar app.jar

ENTRYPOINT ["java", "-Dspring.profiles.active=prod,secret", "-jar", "app.jar"]
