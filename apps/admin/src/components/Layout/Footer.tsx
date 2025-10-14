export function Footer() {
  return (
    <div className="py-2 border-t border-border/60 mt-20">
      <footer className="container text-sm text-gray-400 py-4 flex items-center">
        <a href="/terms" className="font-medium hover:underline mr-4">
          Terms of Use
        </a>
        <a href="/privacy" className="font-medium hover:underline mr-4">
          Privacy Policy
        </a>
        <div className="flex flex-1 justify-end items-center">
          <a
            href="https://github.com/inferst/evotars"
            target="_blank"
            rel="noreferrer"
          >
            <img src="/assets/github.svg" alt="Github logo" width={32} height={32} />
          </a>
        </div>
      </footer>
    </div>
  );
}
