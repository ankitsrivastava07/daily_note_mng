
# Lightweight Java 17 runtime
FROM eclipse-temurin:17-jre

WORKDIR /app

# AWS Lambda Web Adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 \
    /lambda-adapter /opt/extensions/lambda-adapter

# Copy Spring Boot executable JAR
COPY target/*.jar app.jar

EXPOSE 9091

ENV AWS_LWA_PORT=9091
ENV AWS_LWA_READINESS_CHECK_PATH=/health

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]