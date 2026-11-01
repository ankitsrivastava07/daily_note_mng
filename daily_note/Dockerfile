
FROM --platform=linux/amd64 eclipse-temurin:17-jdk

WORKDIR /app

# Copy AWS Lambda Web Adapter extension
COPY --from=446394402725.dkr.ecr.ap-south-1.amazonaws.com/lambda-adapter:0.9.1 \
    /lambda-adapter /opt/extensions/lambda-adapter

# Copy Spring Boot executable JAR
COPY target/*.jar app.jar

# Spring Boot port
ENV SERVER_PORT=9091

# Lambda Web Adapter configuration
ENV AWS_LWA_PORT=9091
ENV AWS_LWA_READINESS_CHECK_PATH=/health

EXPOSE 9091

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
