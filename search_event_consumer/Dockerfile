# Stage 1: Build the JAR with Maven
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy entire build context (repository root)
COPY . .

# Move into subfolder and package application
WORKDIR /app/search_event_consumer
RUN mvn clean package -DskipTests

# Stage 2: Create lightweight runtime container
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Lambda Web Adapter extension
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 \
    /lambda-adapter /opt/extensions/lambda-adapter

# Copy compiled JAR from builder stage (using app.jar explicitly)
COPY --from=builder /app/search_event_consumer/target/app.jar app.jar

EXPOSE 9093

ENV AWS_LWA_PORT=9093
ENV AWS_LWA_READINESS_CHECK_PATH=/health

ENTRYPOINT ["java", "-jar", "app.jar"]
