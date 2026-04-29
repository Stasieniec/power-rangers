import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ProfilePreview({ researcherId }: { researcherId: string }) {
  return (
    <div className="border-cyan/40 bg-cyan/5 rounded-md border p-8 text-center">
      <p className="text-cyan font-mono text-xs tracking-widest uppercase">Profile built</p>
      <h2 className="font-display mt-3 text-3xl">Your profile is live.</h2>
      <p className="text-text-dim mt-3">
        OpenAlex publications and AI-derived expertise tags are saved.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button asChild>
          <Link href={`/researchers/${researcherId}`}>View public profile →</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
