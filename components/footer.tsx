export function Footer() {
  return (
    <footer className="bg-black border-t border-gray-700/50 shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white tracking-tight">AutoMan</span>
            <span className="text-gray-500">•</span>
            <span className="text-sm text-gray-400">
              Automated content creation platform
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-400">
            <span>© 2025 AutoMan</span>
            <span className="text-gray-600">•</span>
            <span>Built with ❤️</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
