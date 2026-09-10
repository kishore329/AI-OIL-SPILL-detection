import { Construction } from "lucide-react";

interface ComingSoonProps {
  moduleName: string;
  moduleNumber: number;
  description: string;
  features?: string[];
}

export function ComingSoon({
  moduleName,
  moduleNumber,
  description,
  features = [],
}: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 animate-fade-in">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-ocean-gradient flex items-center justify-center
                        shadow-glow-blue">
          <Construction className="w-10 h-10 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-spill-500
                        flex items-center justify-center text-xs font-bold text-white
                        shadow-glow-orange">
          {moduleNumber}
        </div>
      </div>

      {/* Text */}
      <h2 className="text-2xl font-bold text-slate-100 mb-2">{moduleName}</h2>
      <p className="text-slate-400 text-sm text-center max-w-md mb-6">{description}</p>

      {/* Badge */}
      <span className="badge badge-warning text-xs px-3 py-1 mb-8">
        Planned for Module {moduleNumber}
      </span>

      {/* Features list */}
      {features.length > 0 && (
        <div className="glass-card p-5 w-full max-w-md">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Planned Features
          </p>
          <ul className="space-y-2">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-ocean-400 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
