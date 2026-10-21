import { EmptyState } from "../../components/EmptyState";
import { Screen } from "../../components/Screen";

export function HabitsScreen() {
  return (
    <Screen title="Habits">
      <EmptyState>Add, edit and reorder your habits here.</EmptyState>
    </Screen>
  );
}
