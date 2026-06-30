package com.expense.logger.repository;

import com.expense.logger.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByNameAndDeletedAtIsNull(String name);
    List<Category> findAllByDeletedAtIsNull();
    boolean existsByNameAndDeletedAtIsNull(String name);
    boolean existsByNameAndIdNotAndDeletedAtIsNull(String name, Long id);

    @org.springframework.data.jpa.repository.Query("SELECT c FROM Category c " +
        "WHERE c.deletedAt IS NULL AND LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Category> searchCategories(@org.springframework.data.repository.query.Param("query") String query);
}
