import { CrisisWizard } from "@/components/crisis/CrisisWizard";

const Crisis = () => {
  // Fixed dark theme - toggle removed from UI
  const isDark = true;

  return (
    <div className={`relative min-h-screen overflow-hidden transition-colors duration-500 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900' 
        : 'bg-gradient-to-br from-rose-100 via-blue-100 to-purple-100'
    }`}>
      {/* Ambient Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isDark ? (
          <>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
          </>
        ) : (
          <>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-300/30 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-300/30 rounded-full blur-3xl" />
            <div className="absolute top-1/2 right-0 w-64 h-64 bg-purple-300/20 rounded-full blur-3xl" />
          </>
        )}
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-6">
        {/* Wizard */}
        <CrisisWizard isDark={isDark} />
      </div>
    </div>
  );
};

export default Crisis;
