# Stage 1: Build the JAR with Maven
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app/search_event_consumer

# Copy root or module pom files to cache dependencies first
COPY search_event_consumer/pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and package
COPY search_event_consumer/src ./src
RUN mvn clean package -DskipTests

# Stage 2: Create lightweight runtime container
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Lambda Web Adapter extension
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 \
    /lambda-adapter /opt/extensions/lambda-adapter

# Copy only the compiled application JAR from builder stage
COPY --from=builder /app/search_event_consumer/target/*.jar app.jar

EXPOSE 9093

ENV AWS_LWA_PORT=9093
ENV AWS_LWA_READINESS_CHECK_PATH=/health

ENTRYPOINT ["java", "-jar", "app.jar"]
