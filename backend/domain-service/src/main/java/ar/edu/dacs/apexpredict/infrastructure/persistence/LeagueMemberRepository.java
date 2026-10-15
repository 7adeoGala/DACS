package ar.edu.dacs.apexpredict.infrastructure.persistence;

import ar.edu.dacs.apexpredict.domain.League;
import ar.edu.dacs.apexpredict.domain.LeagueMember;
import ar.edu.dacs.apexpredict.domain.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeagueMemberRepository extends JpaRepository<LeagueMember, UUID> {
    Optional<LeagueMember> findByLeagueAndUser(League league, User user);
    boolean existsByLeagueAndUser(League league, User user);
    List<LeagueMember> findByLeague(League league);
}
