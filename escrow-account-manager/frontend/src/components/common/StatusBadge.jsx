import React from 'react';

const STATUS_CONFIG = {
  PENDING:              { label: 'Pending',             cls: 'badge-pending' },
  FUNDS_DEPOSITED:      { label: 'Funds Deposited',     cls: 'badge-deposited' },
  MUTATION_INITIATED:   { label: 'Mutation Started',    cls: 'badge-mutation' },
  MUTATION_IN_PROGRESS: { label: 'Mutation In Progress',cls: 'badge-mutation' },
  MUTATION_COMPLETED:   { label: 'Mutation Verified',   cls: 'badge-completed' },
  FUNDS_RELEASED:       { label: 'Funds Released',      cls: 'badge-released' },
  REFUNDED:             { label: 'Refunded',            cls: 'badge-refunded' },
  FAILED:               { label: 'Failed',              cls: 'badge-failed' },
  AVAILABLE:            { label: 'Available',           cls: 'badge-available' },
  SOLD:                 { label: 'Sold',                cls: 'badge-sold' },
  PENDING_PROP:         { label: 'Pending',             cls: 'badge-pending-prop' },
  ACTIVE:               { label: 'Active',              cls: 'badge-available' },
  RELEASED:             { label: 'Released',            cls: 'badge-released' },
  CLOSED:               { label: 'Closed',              cls: 'badge-sold' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status || 'Unknown', cls: 'badge-pending' };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
};

export default StatusBadge;
