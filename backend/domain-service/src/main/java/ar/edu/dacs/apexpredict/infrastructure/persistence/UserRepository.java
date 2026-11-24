package ar.edu.dacs.apexpredict.infrastructure.persistence;

import ar.edu.dacs.apexpredict.domain.User;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByIssuerAndSubject(String issuer, String subject);

    @Query("SELECT COUNT(u) > 0 FROM User u WHERE LOWER(TRIM(u.displayName)) = LOWER(TRIM(:displayName)) AND u.id <> :id")
    boolean existsByDisplayNameIgnoreCaseAndIdNot(@Param("displayName") String displayName, @Param("id") UUID id);

    @Query("SELECT COUNT(u) > 0 FROM User u WHERE LOWER(TRIM(u.displayName)) = LOWER(TRIM(:displayName))")
    boolean existsByDisplayNameIgnoreCase(@Param("displayName") String displayName);

    @Query("SELECT COUNT(u) > 0 FROM User u WHERE u.email IS NOT NULL AND LOWER(TRIM(u.email)) = LOWER(TRIM(:email)) AND u.id <> :id")
    boolean existsByEmailIgnoreCaseAndIdNot(@Param("email") String email, @Param("id") UUID id);

    @Modifying
    @Query(value = """
        INSERT INTO app_users(id, issuer, subject, display_name, email)
        VALUES (:id, :issuer, :subject, :name, :email)
        ON CONFLICT (issuer, subject) DO UPDATE SET
            display_name = CASE
                WHEN app_users.display_name IS NULL OR app_users.display_name = '' OR app_users.display_name = app_users.subject
                THEN EXCLUDED.display_name
                ELSE app_users.display_name
            END,
            email = CASE
                WHEN app_users.email IS NULL OR app_users.email = ''
                THEN EXCLUDED.email
                ELSE app_users.email
            END
        """, nativeQuery = true)
    void upsert(@Param("id") UUID id, @Param("issuer") String issuer, @Param("subject") String subject,
                @Param("name") String name, @Param("email") String email);
}
