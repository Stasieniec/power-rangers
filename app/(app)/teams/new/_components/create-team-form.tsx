"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTeam } from "@/lib/actions/teams";

export function CreateTeamForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createTeam({ name, description });
      if (!res.ok) setError(res.error);
      else router.push(`/teams/${res.teamId}/manage`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <Label htmlFor="name">Team name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={80}
          className="mt-2"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
      </div>
      <div>
        <Label htmlFor="description">Short description (optional)</Label>
        <Input
          id="description"
          name="description"
          maxLength={240}
          className="mt-2"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
          }}
        />
      </div>
      {error && <p className="text-rose text-sm">{error}</p>}
      <Button type="submit" size="lg" disabled={pending || !name.trim()}>
        {pending ? "Creating…" : "Create team"}
      </Button>
    </form>
  );
}
