export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">AutoMan</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">
              Automated content creation platform
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>© 2025 AutoMan</span>
            <span>•</span>
            <span>Built with ❤️</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
