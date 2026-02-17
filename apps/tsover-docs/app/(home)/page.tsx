import HeroExample from "@/content/home/hero-example.mdx";
import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  external?: boolean;
  icon?: React.ReactNode;
}

function Button({
  href,
  children,
  variant = "primary",
  external = false,
  icon,
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200";
  const variants = {
    primary:
      "bg-linear-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5",
    secondary:
      "bg-fd-card border-2 border-fg/20 text-fg hover:border-fg/30 hover:bg-fg/5",
  };

  const linkProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Link
      href={href}
      className={`${baseStyles} ${variants[variant]}`}
      {...linkProps}
    >
      {children}
      {icon}
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-12 py-12">
      {/* Hero */}
      <div className="flex flex-row justify-between items-center text-left gap-16">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-6xl font-bold mb-2 bg-linear-to-r from-blue-600 to-cyan-600 text-transparent bg-clip-text">
              tsover
            </h1>
            <p className="text-2xl text-fg/70">
              TypeScript with Operator Overloading
            </p>
          </div>
          <div className="flex gap-4">
            <Button href="/docs" icon={<ArrowRight className="w-4 h-4" />}>
              Get Started
            </Button>
            <Button
              href="https://github.com/software-mansion-labs/tsover"
              variant="secondary"
              external
              icon={<Github className="w-4 h-4" />}
            >
              GitHub
            </Button>
          </div>
        </div>

        {/* Code Snippet */}
        <div className="w-fit py-4 px-1 max-w-2xl border rounded-xl">
          <HeroExample />
        </div>
      </div>

      {/* Strengths Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto w-full">
        <div className="p-6 rounded-lg border border-fg/10">
          <h3 className="text-xl font-bold mb-2">Sustainable Fork</h3>
          <p className="text-fg/70 text-justify">
            A sustainable fork of TypeScript that requires minimal maintenance
            thanks to a procedural application of patches.
          </p>
        </div>
        <div className="p-6 rounded-lg border border-fg/10">
          <h3 className="text-xl font-bold mb-2">Drop-in Replacement</h3>
          <p className="text-fg/70 text-justify">
            The package is fully compatible with TypeScript and can be used as a
            drop-in replacement.
          </p>
        </div>
        <div className="p-6 rounded-lg border border-fg/10">
          <h3 className="text-xl font-bold mb-2">Progressive Enhancement</h3>
          <p className="text-fg/70 text-justify">
            Libraries can offer operator overloading to their users without
            requiring them to depend on tsover.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-8 border-t border-fg-muted/20 text-sm text-fg/70 w-full max-w-5xl mx-auto">
        <p>
          Created by{" "}
          <a
            href="https://swmansion.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-fg hover:underline"
          >
            Software Mansion
          </a>
        </p>
      </footer>
    </div>
  );
}
