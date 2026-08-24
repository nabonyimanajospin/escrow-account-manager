import { Link, useParams } from 'react-router-dom';

export default function Verify() {
  const { checksum } = useParams();

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="card p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Public verification</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Contract status check</h1>
        <p className="mt-3 break-all font-mono text-xs text-slate-500">{checksum}</p>
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          DEMO · Draft / not a final on-chain certificate
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          Back home
        </Link>
      </div>
    </div>
  );
}
