import { EmptyState } from "../../components/EmptyState";
import { Screen } from "../../components/Screen";

export function StatsScreen() {
  return (
    <Screen title="Stats">
      <EmptyState>Streaks and completion rates will appear here.</EmptyState>
    </Screen>
  );
}
