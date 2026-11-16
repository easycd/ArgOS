package com.gte.argos.gateway.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
    private final AuthService service;
    private final boolean secureCookie;
    private final String sameSite;

    public AuthController(AuthService service,
            @Value("${argos.auth.cookie-secure}") boolean secureCookie,
            @Value("${argos.auth.cookie-same-site}") String sameSite) {
        this.service = service;
        this.secureCookie = secureCookie;
        this.sameSite = sameSite;
    }

    public record LoginRequest(@NotBlank String loginId, @NotBlank String password,
            @NotBlank String client) {}
    public record RefreshRequest(String refreshToken) {}
    public record PasswordRequest(@NotBlank String currentPassword, @NotBlank String newPassword) {}

    @PostMapping("/auth/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request,
            HttpServletRequest http) {
        AuthService.LoginResult result = service.login(request.loginId(), request.password(),
                request.client(), http.getRemoteAddr());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("accessToken", result.accessToken());
        data.put("expiresIn", result.expiresIn());
        data.put("sessionExpiresAt", result.sessionExpiry());
        data.put("pwResetRequired", result.pwResetRequired());
        data.put("firstPage", result.firstPage());
        data.put("user", result.user());
        ResponseEntity.BodyBuilder response = ResponseEntity.ok();
        if ("WEB".equals(request.client())) {
            response.header(HttpHeaders.SET_COOKIE, cookie(result.refreshToken(), result.sessionExpiry()).toString());
        } else {
            data.put("refreshToken", result.refreshToken());
        }
        return response.body(Map.of("success", true, "data", data));
    }

    @PostMapping("/auth/refresh")
    public ResponseEntity<Map<String, Object>> refresh(
            @CookieValue(name = "argos_rt", required = false) String webToken,
            @RequestBody(required = false) RefreshRequest request) {
        boolean web = webToken != null && !webToken.isBlank();
        String refreshToken = web ? webToken : request == null ? null : request.refreshToken();
        AuthService.RefreshResult result = service.refresh(refreshToken, web ? "WEB" : "APP");
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("accessToken", result.accessToken());
        data.put("expiresIn", result.expiresIn());
        data.put("sessionExpiresAt", result.sessionExpiry());
        ResponseEntity.BodyBuilder response = ResponseEntity.ok();
        if (web) {
            response.header(HttpHeaders.SET_COOKIE,
                    cookie(result.refreshToken(), result.sessionExpiry()).toString());
        } else {
            data.put("refreshToken", result.refreshToken());
        }
        return response.body(Map.of("success", true, "data", data));
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Map<String, Object>> logout(@AuthenticationPrincipal Jwt jwt,
            HttpServletRequest request) {
        service.logout(Long.parseLong(jwt.getSubject()),
                ((Number) jwt.getClaim("sessionId")).longValue(), request.getRemoteAddr());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearCookie().toString())
                .body(success(null));
    }

    @PostMapping("/auth/extend")
    public ResponseEntity<Map<String, Object>> extend(@AuthenticationPrincipal Jwt jwt,
            @CookieValue(name = "argos_rt", required = false) String webToken) {
        AuthService.ExtendResult result = service.extend(Long.parseLong(jwt.getSubject()),
                ((Number) jwt.getClaim("sessionId")).longValue(), webToken);
        ResponseEntity.BodyBuilder response = ResponseEntity.ok();
        if ("WEB".equals(result.client())) {
            response.header(HttpHeaders.SET_COOKIE, cookie(webToken, result.sessionExpiry()).toString());
        }
        return response.body(Map.of("success", true,
                "data", Map.of("sessionExpiresAt", result.sessionExpiry())));
    }

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
        return success(service.me(Long.parseLong(jwt.getSubject())));
    }

    @PutMapping("/me/password")
    public Map<String, Object> password(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody PasswordRequest body, HttpServletRequest request) {
        service.changePassword(Long.parseLong(jwt.getSubject()),
                body.currentPassword(), body.newPassword(), request.getRemoteAddr());
        return success(null);
    }

    @ExceptionHandler(AuthFailure.class)
    public ResponseEntity<Map<String, Object>> authFailure(AuthFailure failure) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("code", failure.code());
        error.put("message", failure.getMessage());
        error.putAll(failure.details());
        return ResponseEntity.status(failure.status())
                .body(Map.of("success", false, "error", error));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> invalidRequest() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("success", false, "error",
                        Map.of("code", "VALIDATION_FAILED", "message", "입력값을 확인해 주세요.")));
    }

    private ResponseCookie cookie(String value, Instant expiry) {
        return ResponseCookie.from("argos_rt", value).httpOnly(true).secure(secureCookie)
                .sameSite(sameSite).path("/api/v1/auth")
                .maxAge(Duration.between(Instant.now(), expiry)).build();
    }

    private ResponseCookie clearCookie() {
        return ResponseCookie.from("argos_rt", "").httpOnly(true).secure(secureCookie)
                .sameSite(sameSite).path("/api/v1/auth").maxAge(Duration.ZERO).build();
    }

    private Map<String, Object> success(Object data) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("data", data);
        return body;
    }
}
