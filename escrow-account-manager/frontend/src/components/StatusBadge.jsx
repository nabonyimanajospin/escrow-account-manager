

const StatusBadge = ({ status, variant = 'transaction' }) => {
  const getBadgeClass = (stat) => {
    switch (stat) {
      case 'PENDING':
        return 'badge-pending';
      case 'FUNDED':
        return 'badge-deposited';
      case 'MUTATION_STARTED':
        return 'badge-mutation';
      case 'UNDER_REVIEW':
        return 'badge-role-admin';
      case 'DISPUTED':
        return 'bg-amber-100 text-amber-800 border border-amber-300';
      case 'AWAITING_RECEIPT':
        return 'bg-purple-100 text-purple-800 border border-purple-300';
      case 'AWAITING_BUYER':
        return 'bg-sky-50 text-sky-800 border border-sky-200';
      case 'COMPLETED':
      case 'FUNDS_RELEASED':
        return 'badge-completed';
      case 'REFUNDED':
      case 'CANCELLED':
      case 'FAILED':
        return 'badge-refunded';
      case 'AVAILABLE':
        return 'badge-available';
      case 'SOLD':
        return 'badge-sold';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const getStatusText = (stat) => {
    if (variant === 'property') {
      switch (stat) {
        case 'AVAILABLE':
          return 'Available';
        case 'PENDING':
          return 'In Escrow';
        case 'SOLD':
          return 'Sold';
        default:
          return stat;
      }
    }

    switch (stat) {
      case 'PENDING':
        return 'Pending Agreement';
      case 'FUNDED':
        return 'Escrow Funded';
      case 'MUTATION_STARTED':
        return 'Mutation Started';
      case 'UNDER_REVIEW':
        return 'Under Review';
      case 'DISPUTED':
        return 'Disputed';
      case 'AWAITING_RECEIPT':
        return 'Awaiting Receipt';
      case 'AWAITING_BUYER':
        return 'Awaiting Buyer';
      case 'COMPLETED':
      case 'FUNDS_RELEASED':
        return 'Completed';
      case 'REFUNDED':
      case 'CANCELLED':
        return 'Cancelled / Refunded';
      case 'AVAILABLE':
        return 'Available';
      case 'SOLD':
        return 'Sold';
      default:
        return stat;
    }
  };

  return (
    <span className={`badge ${getBadgeClass(status)}`}>
      {getStatusText(status)}
    </span>
  );
};

export default StatusBadge;
