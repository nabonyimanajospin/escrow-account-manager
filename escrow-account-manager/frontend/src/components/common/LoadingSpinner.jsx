

const LoadingSpinner = ({ text = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-fade-in">
    <div className="relative w-14 h-14">
      <div className="absolute inset-0 rounded-full border-[3px] border-slate-200" />
      <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary-500 animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-primary-500 animate-pulse" />
      </div>
    </div>
    <p className="text-sm text-slate-500 font-medium">{text}</p>
  </div>
);

export default LoadingSpinner;
