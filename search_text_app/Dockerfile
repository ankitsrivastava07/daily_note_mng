FROM eclipse-temurin:21-jdk

WORKDIR /app

# Lambda Web Adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 \
    /lambda-adapter /opt/extensions/lambda-adapter

COPY target/*.jar app.jar

EXPOSE 9092

ENV AWS_LWA_PORT=9092
ENV AWS_LWA_READINESS_CHECK_PATH=/health

ENTRYPOINT ["java", "-jar", "app.jar"]