package com.gte.argos.gateway.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.gte.argos.gateway.auth.AuthRepository.RefreshSession;
import com.gte.argos.gateway.auth.AuthRepository.User;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {
    private static final String SECRET = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
    private final AuthRepository repository = mock(AuthRepository.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final AuthTokens tokens = new AuthTokens(SECRET, 1800, 46800);
    private final AuthService service = new AuthService(repository, tokens, passwords);

    @Test
    void loginCreatesThirteenHourSession() {
        User user = new User(7, 1L, "admin", "hash", "관리자", null,
                "PLANT_ADMIN", true, false);
        when(repository.findUser("admin")).thenReturn(user);
        when(repository.recentFailures(eq("admin"), any())).thenReturn(List.of());
        when(passwords.matches("secret", "hash")).thenReturn(true);
        when(repository.assignments(7)).thenReturn(List.of(
                new AuthRepository.Assignment(1L, 5L, null)));
        when(repository.createSession(eq(7L), eq("WEB"), any(), any())).thenReturn(42L);

        Instant before = Instant.now();
        AuthService.LoginResult result = service.login("admin", "secret", "WEB", "127.0.0.1");
        Instant after = Instant.now();

        assertThat(result.sessionExpiry()).isBetween(before.plus(13, ChronoUnit.HOURS),
                after.plus(13, ChronoUnit.HOURS));
        assertThat(result.expiresIn()).isEqualTo(1800);
        assertThat(result.user().scope().factoryIds()).containsExactly(5L);
        assertThat(tokens.decoder().decode(result.accessToken()).getSubject()).isEqualTo("7");
    }

    @Test
    void extendAddsOneHourToCurrentExpiry() {
        Instant oldExpiry = Instant.now().plus(10, ChronoUnit.HOURS);
        RefreshSession session = new RefreshSession(42, 7, "WEB", oldExpiry, null);
        when(repository.findSession(42, 7)).thenReturn(session);
        when(repository.findRefreshSession(tokens.hash("refresh"))).thenReturn(session);
        when(repository.extendSession(42)).thenReturn(oldExpiry.plus(1, ChronoUnit.HOURS));

        AuthService.ExtendResult result = service.extend(7, 42, "refresh");

        assertThat(result.sessionExpiry()).isEqualTo(oldExpiry.plus(1, ChronoUnit.HOURS));
    }

    @Test
    void fifthWrongPasswordLocksForTenMinutes() {
        User user = new User(7, 1L, "admin", "hash", "관리자", null,
                "PLANT_ADMIN", true, false);
        when(repository.findUser("admin")).thenReturn(user);
        when(repository.recentFailures(eq("admin"), any())).thenReturn(List.of(
                Instant.now(), Instant.now(), Instant.now(), Instant.now()));
        when(passwords.matches("wrong", "hash")).thenReturn(false);

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                service.login("admin", "wrong", "WEB", "127.0.0.1"))
                .isInstanceOf(AuthFailure.class)
                .satisfies(error -> assertThat(((AuthFailure) error).code()).isEqualTo("AUTH_LOCKED"));
        verify(repository).lockLogin(eq("admin"), any());
    }
}
