import { EmptyState } from "../../components/EmptyState";
import { Screen } from "../../components/Screen";

export function TodayScreen() {
  return (
    <Screen title="Today">
      <EmptyState>Your habits for today will appear here.</EmptyState>
    </Screen>
  );
}
