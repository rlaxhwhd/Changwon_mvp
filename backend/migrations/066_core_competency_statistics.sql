-- New, initially empty allocation tables need planner statistics immediately.
-- Otherwise default row estimates can trigger costly JIT for the aggregate views.
ANALYZE dc.core_competency;
ANALYZE dc.core_competency_allocation;
ANALYZE dc.core_competency_allocation_axis;
