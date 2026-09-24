package ar.edu.dacs.apexpredict.infrastructure.persistence;
import ar.edu.dacs.apexpredict.domain.LeagueMember;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface LeagueMemberRepository extends JpaRepository<LeagueMember, UUID> {}
