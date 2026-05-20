
const Loading = () => {
  return (
    <div className="flex items-center justify-center h-[80vh]" role="status" aria-label="loading">
      {/* Injecting the keyframes directly into the document locally */}
      <style>{`
        @keyframes spinner-wave {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(2); }
        }
        .animate-wave {
          animation: spinner-wave 0.9s ease-in-out infinite;
        }
      `}</style>

      <span className="flex h-8 items-center justify-center gap-1" aria-hidden="true">
        {/* Bar 1 */}
        <span 
          className="h-3 w-1 rounded-full bg-primary origin-center animate-wave"
          style={{ animationDelay: '0s' }}
        />
        {/* Bar 2 */}
        <span 
          className="h-5 w-1 rounded-full bg-primary origin-center animate-wave"
          style={{ animationDelay: '0.12s' }}
        />
        {/* Bar 3 */}
        <span 
          className="h-6 w-1 rounded-full bg-primary origin-center animate-wave"
          style={{ animationDelay: '0.24s' }}
        />
        {/* Bar 4 */}
        <span 
          className="h-5 w-1 rounded-full bg-primary origin-center animate-wave"
          style={{ animationDelay: '0.36s' }}
        />
        {/* Bar 5 */}
        <span 
          className="h-3 w-1 rounded-full bg-primary origin-center animate-wave"
          style={{ animationDelay: '0.48s' }}
        />
      </span>
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export default Loading