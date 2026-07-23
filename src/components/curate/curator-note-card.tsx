import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MoodParameters } from "@/lib/types";

export function CuratorNoteCard({
  curatorNote,
  moodParameters,
  usedPersonalization,
}: {
  curatorNote: string;
  moodParameters: MoodParameters;
  usedPersonalization: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Curator&apos;s Note</CardTitle>
        <CardDescription>{curatorNote}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge variant="outline" className="border-primary/25 bg-primary/15 text-primary">
          {moodParameters.energy} energy
        </Badge>
        {moodParameters.descriptors.map((descriptor) => (
          <Badge key={descriptor} variant="outline">
            {descriptor}
          </Badge>
        ))}
        {!usedPersonalization && (
          <Badge variant="outline" className="text-muted-foreground">
            No listening history used
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
