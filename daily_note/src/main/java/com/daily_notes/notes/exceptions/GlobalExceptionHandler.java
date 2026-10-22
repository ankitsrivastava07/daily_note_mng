package com.daily_notes.notes.exceptions;

import com.daily_notes.notes.dto.ErrorResponse;
import com.daily_notes.notes.exceptions.exception.DynamoDbIndexUnavailableException;
import com.daily_notes.notes.exceptions.exception.ShortEntityAlreadyExistException;
import com.daily_notes.notes.records.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import com.daily_notes.notes.exceptions.exception.NoteNotFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import software.amazon.awssdk.core.exception.ApiCallAttemptTimeoutException;
import software.amazon.awssdk.core.exception.ApiCallTimeoutException;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {
    private final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NoteNotFoundException.class)
    public ResponseEntity<?> handleNoteNotFoundException(NoteNotFoundException exp) {
        logger.info("Exception Occurred {}", exp.getMessage());
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<?> handleMissingRequestHeaderException(MissingRequestHeaderException exp) {
        logger.info("Missing Request Header Exception Occurred {}", exp.getMessage());
        return new ResponseEntity<>(new ApiResponse().message(exp.getLocalizedMessage()).success(Boolean.FALSE), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<?> handleNoResourceFoundException(NoResourceFoundException exp) {
        logger.info("No Resource Found Exception Occurred {}", exp.getMessage());
        return new ResponseEntity<>(new ApiResponse().message(exp.getLocalizedMessage()).success(Boolean.FALSE), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler({ApiCallAttemptTimeoutException.class, ApiCallTimeoutException.class})
    public ResponseEntity<?> handleDatabaseTimeoutException(SdkClientException exception) {
        logger.info("Database Timeout Exception Occurred {}", exception.getMessage());
        return new ResponseEntity<>(new ApiResponse().message("Database Request Timeout. Please try again.").success(Boolean.FALSE), HttpStatus.GATEWAY_TIMEOUT);
    }

    @ExceptionHandler(ShortEntityAlreadyExistException.class)
    public ResponseEntity<?> handleShortEntityAlreadyExistException(ShortEntityAlreadyExistException exp) {

        return new ResponseEntity<>(new ApiResponse()
                .message(exp.getLocalizedMessage())
                .success(Boolean.FALSE),
                HttpStatus.CONFLICT);

    }

    @ExceptionHandler(DynamoDbIndexUnavailableException.class)
    public ResponseEntity<?> handleDynamoDbIndexUnavailableException(DynamoDbIndexUnavailableException exp) {
        logger.error("DynamoDB Index Unavailable Exception Occurred", exp);
        return new ResponseEntity<>(new ApiResponse()
                .message("Please retry your request shortly.")
                .success(Boolean.FALSE),
                HttpStatus.SERVICE_UNAVAILABLE);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleInternalServerException(Exception exp) {
        logger.error("Unexpected error occurred", exp);

        Throwable cause = exp;

        while (cause != null) {
            String message = cause.getMessage();

            if (message != null
                    && message.contains(
                    "Cannot read from backfilling global secondary index")) {

                ErrorResponse errorResponse = new ErrorResponse(
                        HttpStatus.SERVICE_UNAVAILABLE.value(),
                        "Task Create is temporarily unavailable. Please retry shortly.",
                        HttpStatus.SERVICE_UNAVAILABLE.name()
                );

                return ResponseEntity
                        .status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(errorResponse);
            }

            cause = cause.getCause();
        }

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "An unexpected error occurred.",
                HttpStatus.INTERNAL_SERVER_ERROR.name()
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(errorResponse);
    }

}
