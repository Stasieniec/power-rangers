import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-6xl text-text">Polymath</h1>
      <p className="mt-4 text-text-dim">Research as a competition.</p>
      <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Foundation laid.</CardTitle>
            <CardDescription>This is a placeholder landing.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button>Primary action</Button>
            <Button variant="secondary" className="ml-3">Secondary</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
