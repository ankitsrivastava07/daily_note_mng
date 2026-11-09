# ==========================================
# Stage 1: Build Spring Boot application
# ==========================================
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn clean package -DskipTests

# ==========================================
# Stage 2: Runtime
# ==========================================
FROM eclipse-temurin:17-jre

WORKDIR /app

# AWS Lambda Web Adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.1.0 \
     /lambda-adapter /opt/extensions/lambda-adapter

# Copy Spring Boot executable JAR
COPY --from=build /app/target/*.jar app.jar

# Spring Boot configuration
ENV PORT=8080
ENV SERVER_PORT=8080

# Lambda Web Adapter configuration
ENV AWS_LWA_PORT=8080
ENV AWS_LWA_READINESS_CHECK_PATH=/actuator/health/liveness
ENV AWS_LWA_READINESS_CHECK_PROTOCOL=http
ENV AWS_LWA_READINESS_CHECK_TIMEOUT=60

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]