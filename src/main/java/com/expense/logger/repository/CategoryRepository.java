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
}
