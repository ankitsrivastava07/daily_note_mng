# Stage 1: Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy the entire repo
COPY . .

# Run a standard Maven build
RUN mvn clean package -DskipTests

# Stage 2: Runtime stage
FROM eclipse-temurin:17-jdk
WORKDIR /app

# Lambda Web Adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 \
    /lambda-adapter /opt/extensions/lambda-adapter

# Copy the built JAR file (finds any jar in target or sub-target folders)
COPY --from=builder /app/**/target/*.jar app.jar

EXPOSE 9093

ENV AWS_LWA_PORT=9093
ENV AWS_LWA_READINESS_CHECK_PATH=/health

ENTRYPOINT ["java", "-jar", "app.jar"]
