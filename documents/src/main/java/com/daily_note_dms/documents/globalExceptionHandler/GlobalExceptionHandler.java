package com.daily_note_dms.documents.globalExceptionHandler;

import com.daily_note_dms.documents.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import software.amazon.awssdk.services.dynamodb.model.ResourceNotFoundException;

import java.util.ArrayList;

@ControllerAdvice
public class GlobalExceptionHandler {

    private final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler
    public ResponseEntity<ApiResponse> handleMissingServletRequestParameterException(MissingServletRequestParameterException exp) {
        logger.info("Handling MissingServletRequestParameterException: {}", exp.getMessage());
        ApiResponse apiResponse = new ApiResponse(exp.getMessage(), Boolean.FALSE,
                new ArrayList<>(), new ArrayList<>());
        return new ResponseEntity<>(apiResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(software.amazon.awssdk.services.dynamodb.model.ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse> handleResourceNotFoundException(software.amazon.awssdk.services.dynamodb.model
                                                                     .ResourceNotFoundException exp) {
        logger.info("Handling ResourceNotFoundException: {}", exp.getMessage());
        ApiResponse apiResponse = new ApiResponse("Internal Server Error", Boolean.FALSE,
                new ArrayList<>(), new ArrayList<>());
        return new ResponseEntity<>(apiResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
