

const StatusBadge = ({ status }) => {
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
      case 'COMPLETED':
      case 'FUNDS_RELEASED':
        return 'badge-completed';
      case 'REFUNDED':
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
    switch (stat) {
      case 'PENDING':
        return 'Pending Agreement';
      case 'FUNDED':
        return 'Escrow Funded';
      case 'MUTATION_STARTED':
        return 'Mutation Started';
      case 'UNDER_REVIEW':
        return 'Under Review';
      case 'COMPLETED':
      case 'FUNDS_RELEASED':
        return 'Completed';
      case 'REFUNDED':
        return 'Refunded';
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
