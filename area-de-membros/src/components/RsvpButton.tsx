import { toggleRsvp } from "@/app/(app)/actions";
import { SubmitButton } from "./ui";
import { IconCheck } from "./Icons";

export function RsvpButton({ eventId, going, className = "" }: { eventId: string; going: boolean; className?: string }) {
  return (
    <form action={toggleRsvp} className={className}>
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="going" value={going ? "1" : "0"} />
      <SubmitButton variant={going ? "secondary" : "primary"} pendingText="..." className="w-full">
        {going ? <><IconCheck className="w-5 h-5" />Presença confirmada</> : "Confirmar presença"}
      </SubmitButton>
    </form>
  );
}
