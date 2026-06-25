# Pagination & Filtering Strategy (pagination_filtering_strategy.md)

## 🎯 Objectives
The primary objective of the **Pagination & Filtering Strategy** is to define the database query pagination and filtering standards. It outlines how pagination parameters are accepted, how dynamic JPA criteria queries are constructed, and how sorting directions are mapped to ensure queries run efficiently.

## 🔍 Scope
- **In-Scope**:
  - Spring Pageable parameter mapping (`page`, `size`, `sort`).
  - Page envelope response structures.
  - Dynamic filtering parameters (date ranges, category IDs, keyword searches).
  - SQL sort constraints to optimize indexes.
- **Out-of-Scope**:
  - Frontend CSS pagination UI components (delegated to `ui_component_strategy.md`).

## 🏗️ Design Decisions
1. **Mandated Spring Data Pageable Parameters**:
   - *Rationale*: Retrieving large lists of records in a single query introduces significant network and memory overhead. All expense ledger and audit log endpoints must enforce page size limits, returning paginated results using Spring Data `Pageable` parameters.
2. **JPA Specifications for Dynamic Queries**:
   - *Rationale*: Creating separate repository methods for every combination of search filters (e.g. search by category, date range, or keywords) leads to duplicate code. Using JPA Specifications allows queries to construct SQL search clauses dynamically based on incoming parameters.

---

## 📋 Pagination API Schema

- **Default Page size**: 10 items.
- **Max Page size**: 100 items (automatically overrides larger client requests).
- **Sort Parameter format**: `property,direction` (e.g. `transactionDate,desc`).
- **Response wrapping**: Envelops results inside standard metadata containing `totalPages`, `totalElements`, `currentPage`, and `pageSize`.

---

## 💎 Advantages
- **Optimal Memory Usage**: Limit parameter structures prevent large queries from exhausting database connections or server memory.
- **Improved Performance**: Composite indexing ensures sorting and filtering run efficiently.
- **Standardized Formats**: Consistent pagination structures simplify client integration across all list views.

## ⚠️ Risks & Mitigations
1. **Risk**: Slow query performance as the database grows.
   - *Mitigation*: Create composite indexes combining `user_id` and `transaction_date` on the expenses table to optimize sorting.
2. **Risk**: Bypassing pagination limits.
   - *Mitigation*: Enforce default page sizes globally in controller arguments using `@PageableDefault(size = 10)` annotations.

## 🚀 Future Scalability Notes
- **Elasticsearch or Solr Integration**: If complex text searches are required in the future, extract index listings to an external search cluster, maintaining database search queries only for primary transaction tables.

## 🛠️ Best Practices
- **Define indexes carefully**: Verify database indexes align with sorting and filtering fields.
- **Validate page bounds**: Limit page parameters to positive integers.
- **Enforce maximum limits**: Automatically restrict query sizes to a maximum of 100 entries.
