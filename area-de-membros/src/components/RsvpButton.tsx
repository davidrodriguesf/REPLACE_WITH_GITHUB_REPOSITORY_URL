import { toggleRsvp } from "@/app/(membros)/actions";
import { SubmitButton } from "./ui";
import { IconCheck } from "./Icons";

export function RsvpButton({ eventId, going, className = "" }: { eventId: string; going: boolean; className?: string }) {
  return (
    <form action={toggleRsvp}>
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="going" value={going ? "1" : "0"} />
      <SubmitButton variant={going ? "secondary" : "light"} pendingText="..." className={className}>
        {going ? <><IconCheck className="w-4 h-4" />Presença confirmada</> : "Vou participar"}
      </SubmitButton>
    </form>
  );
}
